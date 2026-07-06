"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Mail } from "lucide-react";
import api from "@/lib/api";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignupValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  async function onSubmit(values: SignupValues) {
    setServerError(null);
    const { error, confirmationRequired: needsConfirm } = await signUp(values.email, values.password, values.name);
    if (error) {
      setServerError(error.message);
      return;
    }
    if (needsConfirm) {
      setConfirmationRequired(true);
      return;
    }
    router.push("/");
  }

  if (confirmationRequired) {
    return (
      <div className="text-center py-12">
        <Mail className="w-12 h-12 text-secondary mx-auto mb-6" />
        <h2 className="font-display text-[28px] text-primary mb-3">Check your email</h2>
        <p className="text-on-surface-variant mb-8 max-w-sm mx-auto">
          We&apos;ve sent a verification link to your email address. Click the link to activate your account.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="border border-outline-variant text-primary px-8 py-3 text-[12px] font-bold uppercase tracking-[0.2em] hover:bg-surface-container transition-all"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-12">
        <h2 className="font-display text-[32px] text-primary mb-2">Create your account</h2>
        <p className="text-on-surface-variant">Join VTryon and curate your digital wardrobe instantly.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {serverError && (
          <p className="text-sm text-error bg-error-container/40 border border-error/20 p-3">
            {serverError}
          </p>
        )}

        <div className="group">
          <label htmlFor="name" className="block text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant mb-1 group-focus-within:text-primary transition-colors">
            Full Name
          </label>
          <input
            id="name"
            placeholder="Aarav Sharma"
            className="w-full bg-transparent border-0 border-b border-outline-variant py-3 px-0 focus:ring-0 focus:border-secondary transition-all placeholder:text-outline/40 text-lg"
            {...register("name")}
          />
          {errors.name && <p className="text-xs text-error mt-1">{errors.name.message}</p>}
        </div>

        <div className="group">
          <label htmlFor="email" className="block text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant mb-1 group-focus-within:text-primary transition-colors">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="aarav@example.com"
            className="w-full bg-transparent border-0 border-b border-outline-variant py-3 px-0 focus:ring-0 focus:border-secondary transition-all placeholder:text-outline/40 text-lg"
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-error mt-1">{errors.email.message}</p>}
        </div>

        <div className="group">
          <label htmlFor="password" className="block text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant mb-1 group-focus-within:text-primary transition-colors">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="w-full bg-transparent border-0 border-b border-outline-variant py-3 px-0 focus:ring-0 focus:border-secondary transition-all placeholder:text-outline/40 text-lg"
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

        <div className="group">
          <label htmlFor="confirmPassword" className="block text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant mb-1 group-focus-within:text-primary transition-colors">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            className="w-full bg-transparent border-0 border-b border-outline-variant py-3 px-0 focus:ring-0 focus:border-secondary transition-all placeholder:text-outline/40 text-lg"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && <p className="text-xs text-error mt-1">{errors.confirmPassword.message}</p>}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-on-primary py-4 text-[12px] font-bold uppercase tracking-[0.2em] hover:bg-primary-container transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? "Creating Account..." : "Create Account"}
          </button>
        </div>

        <div className="relative flex items-center py-4">
          <div className="flex-grow border-t border-outline-variant/30" />
          <span className="flex-shrink mx-4 text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">
            Or continue with
          </span>
          <div className="flex-grow border-t border-outline-variant/30" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            className="flex items-center justify-center gap-3 border border-outline-variant py-3 px-4 text-[10px] font-bold uppercase tracking-[0.1em] hover:bg-surface-container-low transition-colors"
            onClick={async () => {
              try {
                const res = await api.post<{ data: { url: string } }>("/auth/social", { provider: "google" });
                window.location.href = res.data.data.url;
              } catch {}
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-3 border border-outline-variant py-3 px-4 text-[10px] font-bold uppercase tracking-[0.1em] hover:bg-surface-container-low transition-colors"
            onClick={async () => {
              try {
                const res = await api.post<{ data: { url: string } }>("/auth/social", { provider: "facebook" });
                window.location.href = res.data.data.url;
              } catch {}
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Facebook
          </button>
        </div>

        <p className="text-center mt-8 text-on-surface-variant">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-bold editorial-underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
