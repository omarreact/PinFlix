"use client";

import { FormEvent, useEffect, useState } from "react";

type ServiceStatus = {
  ok: boolean;
  host: string;
  porichoyConfigured: boolean;
  providerNetwork: {
    reachable: boolean;
    status: number | null;
    state: "reachable" | "degraded" | "unreachable";
    reason?: string;
  };
  ready: boolean;
  time: string;
};

export default function NidDobBackupPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [statusError, setStatusError] = useState("");

  async function refreshStatus() {
    setStatusError("");
    try {
      const response = await fetch("/api/nid-dob/status", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await response.json();
      if (response.status === 401) {
        setAuthenticated(false);
        setStatus(null);
        return;
      }
      if (!response.ok) throw new Error(data.error || "Status check failed.");
      setStatus(data);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Status check failed.");
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/nid-dob/auth", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const data = await response.json();
        if (!active) return;
        setAuthenticated(Boolean(response.ok && data.authenticated));
        if (response.ok && data.authenticated) void refreshStatus();
      } catch {
        if (active) setAuthenticated(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setAuthError("");
    setChecking(true);
    try {
      const response = await fetch("/api/nid-dob/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok || !data.authenticated) {
        throw new Error(data.error || "Access denied.");
      }
      setPassword("");
      setAuthenticated(true);
      await refreshStatus();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Access denied.");
    } finally {
      setChecking(false);
    }
  }

  async function logout() {
    await fetch("/api/nid-dob/auth", {
      method: "DELETE",
      cache: "no-store",
      credentials: "same-origin",
    }).catch(() => undefined);
    setAuthenticated(false);
    setStatus(null);
  }

  if (authenticated === null) {
    return (
      <main className="min-h-screen bg-[#f4f8fb] grid place-items-center p-5 text-slate-900">
        <div className="text-sm font-semibold text-slate-500">Checking protected session…</div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,#e6f7ef_0,transparent_30%),radial-gradient(circle_at_85%_90%,#e8f4fb_0,transparent_32%),#f4f8fb] grid place-items-center p-5 text-slate-900">
        <section className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_24px_80px_rgba(30,60,45,.12)]">
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-xl text-emerald-700">🔐</div>
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[.15em] text-emerald-700">Backup verification host</p>
          <h1 className="text-3xl font-black tracking-tight">Identity verification</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Password-only access. No username required.</p>

          <form className="mt-6 space-y-3" onSubmit={login}>
            <label className="block text-xs font-bold text-slate-700" htmlFor="backup-password">Access password</label>
            <input
              id="backup-password"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-13 w-full rounded-2xl border border-slate-300 bg-white px-4 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              required
            />
            {authError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{authError}</div>}
            <button
              type="submit"
              disabled={checking}
              className="h-12 w-full rounded-full bg-emerald-700 font-extrabold text-white disabled:opacity-50"
            >
              {checking ? "Checking…" : "Unlock console"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  const ready = status?.ready === true;

  return (
    <main className="min-h-screen bg-[#f4f8fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white">P</div>
            <div>
              <div className="text-sm font-black tracking-[.12em]">PINFLIX BACKUP</div>
              <div className="text-[10px] font-semibold text-slate-500">Protected identity console</div>
            </div>
          </div>
          <button onClick={logout} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold">Logout</button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-emerald-700">NID + Birth Registration</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Backup verification host</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          This page is hosted directly on the PinFlix Vercel deployment so it does not depend on the unavailable ilm.pincodeit.com iframe.
        </p>

        <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(36,63,82,.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[.12em] text-slate-500">Service status</div>
              <h2 className="mt-2 text-2xl font-black">{ready ? "Verification backend is ready" : "Verification backend still needs configuration"}</h2>
            </div>
            <span className={`rounded-full border px-3 py-2 text-xs font-extrabold ${ready ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
              {ready ? "READY" : "SETUP REQUIRED"}
            </span>
          </div>

          {status ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[10px] font-black uppercase tracking-[.1em] text-slate-500">Porichoy API key</div>
                <div className="mt-1 text-sm font-bold">{status.porichoyConfigured ? "Configured" : "Not configured"}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[10px] font-black uppercase tracking-[.1em] text-slate-500">Provider network</div>
                <div className="mt-1 text-sm font-bold">{status.providerNetwork.state}</div>
              </div>
            </div>
          ) : (
            <div className="mt-6 text-sm text-slate-500">Checking provider configuration…</div>
          )}

          {statusError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{statusError}</div>}

          {!ready && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              The alternate domain removes the iframe/domain problem, but it cannot create authorized government API access by itself. A valid server-side <code className="rounded bg-white px-1 py-0.5">PORICHOY_API_KEY</code> and a reachable Porichoy production host are still required before NID or Birth Registration details can be queried.
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => void refreshStatus()} className="rounded-full bg-emerald-700 px-5 py-3 text-xs font-extrabold text-white">
              Check again
            </button>
            <a href="https://www.pincodeit.com/nid_dob" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-xs font-extrabold">
              Return to Pincode
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
