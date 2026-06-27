"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card>
        <CardContent className="p-8 text-center">
          <Mail className="w-16 h-16 text-purple-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Check your email</h2>
          <p className="text-muted-foreground mb-4">
            We&apos;ve sent a verification link to your email address. Click the link to activate your account.
          </p>
          <Button variant="outline" onClick={() => router.push("/login")}>
            Go to login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>Join VTryon and try on outfits instantly</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {serverError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {serverError}
            </p>
          )}

          <div className="space-y-1">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" placeholder="Aarav Sharma" {...register("name")} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="aarav@example.com" {...register("email")} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" {...register("password")} />
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input id="confirmPassword" type="password" placeholder="Repeat your password" {...register("confirmPassword")} />
            {errors.confirmPassword && (
              <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account…" : "Create account"}
          </Button>

          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">or continue with</span>
            </div>
          </div>

          <div className="flex gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={async () => {
                try {
                  const res = await api.post<{ data: { url: string } }>("/auth/social", { provider: "google" });
                  window.location.href = res.data.data.url;
                } catch {}
              }}
            >
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={async () => {
                try {
                  const res = await api.post<{ data: { url: string } }>("/auth/social", { provider: "facebook" });
                  window.location.href = res.data.data.url;
                } catch {}
              }}
            >
              Facebook
            </Button>
          </div>

          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
