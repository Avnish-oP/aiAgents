import { redis } from "@/lib/redis";
import { randomInt } from "crypto";
import { sendEmail } from "@/utils/email";

const OTP_TTL_SECONDS = 10 * 60;
const OTP_SEND_WINDOW_SECONDS = 15 * 60;
const OTP_SEND_LIMIT = 3;
const OTP_VERIFY_LIMIT = 5;

async function isWithinRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
) {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }

  return count <= limit;
}

export async function sendOTPEmail(email: string) {
  const allowed = await isWithinRateLimit(
    `otp_send:${email}`,
    OTP_SEND_LIMIT,
    OTP_SEND_WINDOW_SECONDS,
  );

  if (!allowed) {
    return {
      success: false,
      message: "Too many OTP requests. Try again later.",
    };
  }

  const otp = randomInt(100000, 999999).toString();

  try {
    await sendEmail(email, "Your OTP Code", `Your OTP code is: ${otp}`);
    await redis.set(`otp:${email}`, otp, { ex: OTP_TTL_SECONDS });
    return { success: true, message: "OTP sent to email" };
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new Error("Failed to send OTP email.");
  }
}

export async function verifyOTPEmail(email: string, otp: string) {
  const allowed = await isWithinRateLimit(
    `otp_verify:${email}`,
    OTP_VERIFY_LIMIT,
    OTP_TTL_SECONDS,
  );

  if (!allowed) {
    return {
      success: false,
      expired: false,
      message: "Too many verification attempts. Request a new code.",
    };
  }

  const storedOtp = await redis.get(`otp:${email}`);
  if (!storedOtp) {
    return { success: false, expired: true, message: "OTP expired" };
  }

  if (String(storedOtp) === String(otp)) {
    await redis.del(`otp:${email}`);
    await redis.del(`otp_verify:${email}`);
    return { success: true, message: "OTP verified successfully" };
  }

  return { success: false, expired: false, message: "Invalid OTP" };
}
