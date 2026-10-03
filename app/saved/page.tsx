import { Bookmark } from "lucide-react";
import { SavedLibrary } from "@/src/components/saved-library";

export default function SavedPage() {
  return (
    <div className="space-y-8">
      <section className="animate-slide-up">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-accent">
          <Bookmark size={14} />
          Personal
        </div>
        <h1 className="text-4xl font-black tracking-[-.04em] text-gradient md:text-5xl">My List</h1>
        <p className="mt-3 text-sm font-light text-zinc-400">Titles you saved on this device.</p>
      </section>
      <SavedLibrary />
    </div>
  );
}
