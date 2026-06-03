import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/users";
import bcrypt from "bcryptjs";
import { sendOTPEmail } from "@/utils/otp";
import { RegisterSchema } from "@/utils/auth/validations";
import { redis } from "@/lib/redis";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { name, email, password } = parsed.data;

    await connectDB();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await redis.set(
      `pending_user:${email}`,
      JSON.stringify({ name, email, password: hashedPassword }),
      { ex: 900 },
    ); // Store pending user for 15 minutes

    const result = await sendOTPEmail(email);
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 429 },
      );
    }

    return NextResponse.json({ message: "OTP sent to email" }, { status: 200 });
  } catch (error) {
    console.error("Error in registration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
