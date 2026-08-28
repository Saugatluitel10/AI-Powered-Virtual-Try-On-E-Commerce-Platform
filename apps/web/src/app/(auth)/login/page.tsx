"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter(); const params = useSearchParams(); const { signIn } = useAuth();
  const [email, setEmail] = useState("demo@prashna.clo"); const [password, setPassword] = useState("Demo@123"); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); if (!email.trim() || !password) { setError("Email and password are required."); return; } setLoading(true); setError(""); const result = await signIn(email, password); setLoading(false); if (result.error) setError(result.error.message); else { const requested = params.get("next"); router.push(requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/"); } }
  return <><p className="text-xs font-bold uppercase text-[#b61f32]">Welcome back</p><h1 className="mt-2 font-display text-4xl">Sign in to prashna.clo</h1><p className="mt-3 text-sm text-neutral-500">Your account is stored only in this browser.</p><form onSubmit={submit} className="mt-8 space-y-5">{error && <p className="border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}<Field label="Email" type="email" value={email} onChange={setEmail} /><Field label="Password" type="password" value={password} onChange={setPassword} /><button disabled={loading} className="w-full bg-[#b61f32] px-5 py-4 text-sm font-bold uppercase text-white disabled:opacity-50">{loading ? "Signing in..." : "Sign in"}</button></form><div className="mt-5 border border-black/10 bg-[#f8f7f3] p-4 text-xs"><strong>Demo account</strong><p className="mt-1">demo@prashna.clo · Demo@123</p></div><p className="mt-7 text-center text-sm">New here? <Link href="/signup" className="font-bold text-[#b61f32] underline">Create an account</Link></p></>;
}
function Field({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (value: string) => void }) { return <label className="block text-xs font-bold uppercase">{label}<input required type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-12 w-full border border-black/25 px-3 text-base font-normal normal-case" /></label>; }
