"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    const { error } = await signIn(values.email, values.password);
    if (error) {
      setServerError("Invalid email or password. Please try again.");
      return;
    }
    router.push(next);
  }

  return (
    <div>
      <div className="mb-12">
        <h2 className="font-display text-[32px] text-primary mb-2">Welcome back</h2>
        <p className="text-on-surface-variant">Sign in to your VTryon account to access your personal showroom.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {serverError && (
          <p className="text-sm text-error bg-error-container/40 border border-error/20 p-3">
            {serverError}
          </p>
        )}

        <div className="space-y-1">
          <label htmlFor="email" className="block text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="aarav@example.com"
            className="w-full bg-transparent border-0 border-b border-outline-variant py-4 px-0 focus:ring-0 focus:border-secondary transition-all placeholder:text-outline-variant/50 text-lg"
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-error mt-1">{errors.email.message}</p>}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-end">
            <label htmlFor="password" className="block text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">
              Password
            </label>
            <Link href="/forgot-password" className="text-[10px] font-bold uppercase tracking-[0.1em] text-secondary editorial-underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="w-full bg-transparent border-0 border-b border-outline-variant py-4 px-0 focus:ring-0 focus:border-secondary transition-all placeholder:text-outline-variant/50 text-lg"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary transition-colors text-sm"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.password && <p className="text-xs text-error mt-1">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-on-primary py-5 text-[12px] font-bold uppercase tracking-[0.2em] hover:bg-on-surface-variant transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
        >
          {isSubmitting ? "Signing In..." : "Sign In"}
        </button>

        <div className="relative flex items-center py-4">
          <div className="flex-grow border-t border-outline-variant/30" />
          <span className="flex-shrink mx-4 text-[10px] font-bold uppercase tracking-[0.1em] text-outline-variant">
            Or continue with
          </span>
          <div className="flex-grow border-t border-outline-variant/30" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            className="flex items-center justify-center gap-3 border border-outline-variant/50 py-4 px-4 hover:bg-surface-container transition-all active:scale-[0.98]"
            onClick={async () => {
              try {
                const res = await api.post<{ data: { url: string } }>("/auth/social", { provider: "google" });
                window.location.href = res.data.data.url;
              } catch {}
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em]">Google</span>
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-3 border border-outline-variant/50 py-4 px-4 hover:bg-surface-container transition-all active:scale-[0.98]"
            onClick={async () => {
              try {
                const res = await api.post<{ data: { url: string } }>("/auth/social", { provider: "facebook" });
                window.location.href = res.data.data.url;
              } catch {}
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em]">Facebook</span>
          </button>
        </div>

        <p className="text-center mt-8 text-on-surface-variant">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary font-bold editorial-underline">Create one</Link>
        </p>
      </form>
    </div>
  );
}
