"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { Shield, Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const unauthorizedError = searchParams.get("error") === "unauthorized";
  const [serverError, setServerError] = useState<string | null>(
    unauthorizedError ? "You do not have admin access." : null
  );
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
      setServerError("Invalid email or password.");
      return;
    }

    try {
      const res = await api.get<{ data: { role: string } }>("/auth/me");
      if (res.data.data.role !== "ADMIN") {
        setServerError("This account does not have admin privileges.");
        return;
      }
      router.push("/dashboard");
    } catch {
      setServerError("Failed to verify admin access.");
    }
  }

  return (
    <div className="min-h-screen flex bg-primary">
      <div className="grid grid-cols-1 lg:grid-cols-2 w-full">
        {/* Left — branding */}
        <section className="hidden lg:flex items-center justify-center p-16">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-secondary mx-auto mb-8 flex items-center justify-center">
              <Shield className="w-8 h-8 text-on-secondary" />
            </div>
            <h1 className="font-display text-[48px] leading-[1.1] text-on-primary mb-4">
              Admin Portal
            </h1>
            <p className="text-on-primary/50 text-lg leading-relaxed">
              Manage your platform, monitor analytics, and oversee operations from a single command center.
            </p>
          </div>
        </section>

        {/* Right — form */}
        <section className="flex items-center justify-center px-6 md:px-24 py-24 bg-surface-bright">
          <div className="w-full max-w-md">
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-6 lg:hidden">
                <Shield className="w-5 h-5 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
                  Admin Access
                </span>
              </div>
              <h2 className="font-display text-[32px] text-primary mb-2">
                Sign in
              </h2>
              <p className="text-on-surface-variant">
                Access the VTryon administration panel.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {serverError && (
                <p className="text-sm text-error bg-error-container/40 border border-error/20 p-3">
                  {serverError}
                </p>
              )}

              <div className="group">
                <label
                  htmlFor="email"
                  className="block text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant mb-1 group-focus-within:text-primary transition-colors"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="admin@vtryon.com"
                  className="w-full bg-transparent border-0 border-b border-outline-variant py-4 px-0 focus:ring-0 focus:border-secondary transition-all placeholder:text-outline-variant/50 text-lg"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-error mt-1">{errors.email.message}</p>
                )}
              </div>

              <div className="group">
                <label
                  htmlFor="password"
                  className="block text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant mb-1 group-focus-within:text-primary transition-colors"
                >
                  Password
                </label>
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
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-error mt-1">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-on-primary py-5 text-[12px] font-bold uppercase tracking-[0.2em] hover:bg-on-surface-variant transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Sign In to Admin"
                )}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
