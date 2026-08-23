"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function SignupPage() {
  const router = useRouter(); const { signUp } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" }); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); if (!form.name.trim() || !form.email.trim() || !form.password) { setError("Complete every field."); return; } if (form.name.trim().length < 2) { setError("Name must contain at least 2 characters."); return; } if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) { setError("Enter a valid email address."); return; } if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/\d/.test(form.password)) { setError("Password must be 8+ characters with an uppercase letter and a number."); return; } if (form.password !== form.confirm) { setError("Passwords do not match."); return; } setLoading(true); setError(""); const result = await signUp(form.email, form.password, form.name); setLoading(false); if (result.error) setError(result.error.message); else router.push("/shop"); }
  const field = (key: keyof typeof form, label: string, type = "text") => <label className="block text-xs font-bold uppercase">{label}<input required type={type} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-2 h-12 w-full border border-black/25 px-3 text-base font-normal normal-case" /></label>;
  return <><p className="text-xs font-bold uppercase text-[#b61f32]">Join locally</p><h1 className="mt-2 font-display text-4xl">Create your account</h1><p className="mt-3 text-sm text-neutral-500">No email verification or external service required.</p><form onSubmit={submit} className="mt-8 space-y-4">{error && <p className="border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}{field("name", "Full name")}{field("email", "Email", "email")}{field("password", "Password", "password")}{field("confirm", "Confirm password", "password")}<button disabled={loading} className="w-full bg-[#b61f32] px-5 py-4 text-sm font-bold uppercase text-white disabled:opacity-50">{loading ? "Creating account..." : "Create account"}</button></form><p className="mt-7 text-center text-sm">Already have an account? <Link href="/login" className="font-bold text-[#b61f32] underline">Sign in</Link></p></>;
}
