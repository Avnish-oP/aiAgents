import { NextRequest, NextResponse } from "next/server";
import { OtpSchema } from "@/utils/auth/validations";
import { User } from "@/models/users";
import { connectDB } from "@/lib/mongodb";
import { verifyOTPEmail } from "@/utils/otp";
import { redis } from "@/lib/redis";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = OtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { email, otp } = parsed.data;

    await connectDB();

    const pendingUserData = await redis.get<string>(`pending_user:${email}`);
    if (!pendingUserData) {
      return NextResponse.json(
        { error: "No pending registration found" },
        { status: 400 },
      );
    }

    const result = await verifyOTPEmail(email, otp);
    if (!result.success) {
      return NextResponse.json(
        { error: result.message, expired: result.expired },
        { status: result.expired ? 410 : 400 },
      );
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await redis.del(`pending_user:${email}`);
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 },
      );
    }

    const userData = typeof pendingUserData === "string" ? JSON.parse(pendingUserData) : pendingUserData;
    const { name, password } = userData;
    await User.create({
      userid: `email:${email}`,
      name,
      email,
      password,
      isVerified: true,
    });
    await redis.del(`pending_user:${email}`);

    return NextResponse.json(
      { message: "OTP verified and user registered successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in OTP verification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
