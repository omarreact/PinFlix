"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("Demo Viewer");
  const [email, setEmail] = useState("viewer+new@example.com");
  const [password, setPassword] = useState("Viewer123!");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json().catch(() => ({}));
    setPending(false);

    if (!response.ok) {
      setError(data.error?.message ?? "Unable to create account.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-5 py-20">
      <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-panel/80 p-6 shadow-2xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.22em] text-accent">Create account</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-.04em] text-white">Join StreamFlix</h1>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-zinc-200">Name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-brand/60 focus:outline-none" required />
          </div>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-200">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-brand/60 focus:outline-none" required />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-zinc-200">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-brand/60 focus:outline-none" required />
          </div>

          {error ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}

          <button type="submit" disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-brand via-violet-500 to-brand-2 px-5 py-3 font-bold text-white disabled:opacity-60">
            {pending ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-sm text-zinc-400">
          Already have an account? <Link href="/login" className="font-semibold text-accent hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
