// src/app/(auth)/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterSchema, type RegisterInput } from "@/utils/auth/validations";
import { signIn } from "next-auth/react";
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

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(RegisterSchema) });

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
      return;
    }

    router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black px-4 animate-reveal">
      <div className="w-full max-w-[360px]">
        <Logo />
        
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">Create account</h1>
          <p className="text-[#888888] text-sm">Start building your second brain</p>
        </div>

        <button
          onClick={() => signIn("github", { redirectTo: "/chat" })}
          className="w-full flex items-center justify-center gap-3 border border-[#333] hover:border-[#666] bg-[#0a0a0a] rounded-md px-4 py-2.5 text-sm font-medium text-white transition-colors mb-6"
        >
          <GithubIcon />
          Continue with GitHub
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#222]" />
          </div>
          <div className="relative flex justify-center text-xs text-[#888888]">
            <span className="px-3 bg-black">or</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#888888] mb-1.5">Full name</label>
            <input
              {...register("name")}
              placeholder="Avnish"
              className="w-full bg-[#0a0a0a] border border-[#333] rounded-md px-3 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1.5">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#888888] mb-1.5">Email</label>
            <input
              {...register("email")}
              type="email"
              placeholder="you@example.com"
              className="w-full bg-[#0a0a0a] border border-[#333] rounded-md px-3 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#888888] mb-1.5">Password</label>
            <input
              {...register("password")}
              type="password"
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              className="w-full bg-[#0a0a0a] border border-[#333] rounded-md px-3 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-md px-3 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-2.5 text-sm disabled:opacity-50 mt-2"
          >
            {loading ? "Sending OTP..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-[#888888] mt-8">
          Already have an account?{" "}
          <Link href="/login" className="text-white font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function GithubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12" />
    </svg>
  );
}
