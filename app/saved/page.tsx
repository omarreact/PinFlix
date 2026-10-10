import { Bookmark } from "lucide-react";
import { SavedLibrary } from "@/src/components/saved-library";

export default function SavedPage() {
  return (
    <div className="space-y-8">
      <section className="">
        <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-accent">
          <Bookmark size={14} />
          Personal
        </div>
        <h1 className="text-4xl font-medium tracking-[-.055em] text-fg md:text-5xl">My List</h1>
        <p className="mt-3 text-sm font-light text-muted">Titles you saved on this device.</p>
      </section>
      <SavedLibrary />
    </div>
  );
}
