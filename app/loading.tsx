import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
      <div className="relative flex items-center justify-center">
        {/* Ambient glow */}
        <div className="absolute inset-0 h-[120px] w-[120px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-brand)]/20 blur-2xl animate-pulse" />
        
        {/* Outer glowing rings */}
        <div className="absolute h-20 w-20 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full border border-[var(--color-brand)]/40" />
        <div className="absolute h-16 w-16 animate-[spin_3s_linear_infinite] rounded-full border-b-2 border-r-2 border-[var(--color-brand)]" />
        
        {/* Center Icon */}
        <Loader2 className="relative z-10 h-8 w-8 animate-spin text-[var(--color-fg)]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-2 mt-4">
        <span className="text-gradient text-xl font-black tracking-[0.2em] uppercase">
          PinFlix
        </span>
        <span className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-subtle)]">
          Preparing Cinematic Experience...
        </span>
      </div>
    </div>
  );
}
