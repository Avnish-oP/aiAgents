import { NextResponse } from "next/server";
import { sendOTPEmail } from "@/utils/otp";
import { ResendOtpSchema } from "@/utils/auth/validations";
import { redis } from "@/lib/redis";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ResendOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { email } = parsed.data;

    const pendingUserData = await redis.get(`pending_user:${email}`);
    if (!pendingUserData) {
      return NextResponse.json(
        { error: "No pending registration found" },
        { status: 400 },
      );
    }

    const result = await sendOTPEmail(email);
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { message: "OTP resent to email" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in resending OTP:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
