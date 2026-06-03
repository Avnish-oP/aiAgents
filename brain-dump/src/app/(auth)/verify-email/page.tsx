// src/app/(auth)/verify-email/page.tsx
"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 group mb-10 justify-center">
      <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center transition-transform duration-300 group-hover:rotate-90">
        <div className="w-2 h-2 bg-black rounded-sm" />
      </div>
      <span className="text-sm font-bold tracking-tight text-white">Brain Dump</span>
    </Link>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const canResend = resendTimer <= 0;

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Enter all 6 digits.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp: code }),
    });
    const json = await res.json();

    if (!res.ok) {
      setLoading(false);
      setError(json.error);
      if (json.expired) {
        // OTP expired — clear inputs
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
      return;
    }

    router.push("/login?verified=true");
  };

  const handleResend = async () => {
    setResendTimer(60);
    setError("");

    const res = await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const json = await res.json();
      setError(json.error);
      setResendTimer(0);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black px-4 animate-reveal">
      <div className="w-full max-w-[360px] flex flex-col items-center">
        <Logo />

        <div className="w-12 h-12 bg-[#111] border border-[#333] rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-xl text-white">
            mail
          </span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">
          Check your email
        </h1>
        <p className="text-[#888888] text-sm text-center mb-1">
          We sent a 6-digit code to
        </p>
        <p className="font-medium text-white mb-8">{email}</p>

        {/* OTP inputs */}
        <div className="flex gap-2 justify-center mb-6 w-full" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-14 text-center text-xl font-bold bg-[#0a0a0a] border border-[#333] rounded-md text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-md px-3 py-2.5 w-full mb-6 text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={loading || otp.join("").length !== 6}
          className="w-full btn-primary py-2.5 text-sm disabled:opacity-50 mb-6"
        >
          {loading ? "Verifying..." : "Verify email"}
        </button>

        <p className="text-sm text-[#888888]">
          Didn&apos;t receive it?{" "}
          {canResend ? (
            <button
              onClick={handleResend}
              className="text-white font-medium hover:underline cursor-pointer"
            >
              Resend code
            </button>
          ) : (
            <span className="text-[#555]">Resend in {resendTimer}s</span>
          )}
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
