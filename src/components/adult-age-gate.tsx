"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ShieldAlert } from "lucide-react";

/** Self-attested age confirmation only. Not identity or legal age verification. */
export function AdultAgeGate() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function confirmAge() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/catalogue/adult-consent", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      if (!response.ok) throw new Error("Unable to confirm age");
      router.refresh();
    } catch {
      setError("Could not confirm your age. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl py-10 sm:py-20" aria-labelledby="age-gate-title">
      <div className="glass-panel rounded-xl p-6 sm:p-10">
        <ShieldAlert className="mb-5 text-warning" size={34} aria-hidden="true" />
        <p className="pf-eyebrow">MATURE AUDIENCES</p>
        <h1 id="age-gate-title" className="mt-3 text-3xl font-semibold text-fg sm:text-4xl">Adult catalogue · 18+</h1>
        <p className="mt-5 text-sm leading-7 text-muted">
          This section is intended for adults aged 18 or older. It may include mature themes.
          Age confirmation is required before any titles or artwork in this category are displayed.
        </p>
        <p className="mt-3 text-sm leading-7 text-muted">
          PinFlix shows only titles labelled by its existing video provider. Confirming your age
          does not guarantee that any title is available to stream or legally available in your location.
        </p>
        {error && <p role="alert" className="mt-5 text-sm text-danger">{error}</p>}
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" disabled={pending} onClick={() => void confirmAge()}
            className="pf-action media-focus disabled:cursor-wait disabled:opacity-60">
            {pending ? "Checking…" : "I am 18 or older"}
          </button>
          <Link href="/catalogue" className="pf-action pf-action-outline media-focus">
            <ArrowLeft size={16}/> Back to catalogue
          </Link>
        </div>
        <p className="mt-7 text-xs leading-6 text-subtle">
          This is a self-declared age check, not an identity-based verification service.
        </p>
      </div>
    </section>
  );
}
