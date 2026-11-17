"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json().catch(() => ({}));
    setPending(false);

    if (!response.ok) {
      setError(data.error?.message ?? "Unable to sign in.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-5 py-20">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-xl border border-white/10 bg-panel  md:grid-cols-[1fr_1fr]">
        <div className="hidden border-r border-line bg-surface p-9 md:flex md:flex-col md:justify-between">
          <div><p className="pf-eyebrow">THE PINFLIX EDIT</p><h1 className="pf-title mt-5">Your next great <em className="pf-serif">film.</em></h1></div>
          <p className="text-sm leading-7 text-muted">A little less scrolling. A little more cinema.</p>
        </div>
        <div className="p-6 sm:p-8">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[.22em] text-accent">Welcome back</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-.04em] text-fg">Sign in</h2>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-200">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-brand focus:outline-none"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-zinc-200">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-brand focus:outline-none"
                placeholder="Enter your password"
                required
              />
            </div>

            {error ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}

            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-brand px-5 py-3 font-bold text-bg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-sm text-muted">
            Need an account? <Link href="/register" className="font-semibold text-accent hover:underline">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
