"use client";
export default function Error({ reset }: { reset: () => void }) { return <div className="mx-auto max-w-xl py-24 text-center"><h1 className="text-2xl font-bold">Something interrupted playback.</h1><p className="mt-2 text-muted">Try again or return home.</p><button onClick={reset} className="mt-7 rounded-xl bg-brand px-5 py-3 font-semibold">Try again</button></div>; }
