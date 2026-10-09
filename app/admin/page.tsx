import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { setPublication } from "./actions";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") return <p className="text-zinc-300">An administrator account is required.</p>;
  const titles = await prisma.title.findMany({ orderBy: { updatedAt: "desc" }, include: { _count: { select: { streams: true, seasons: true } } } });
  return <div className="space-y-6">
    <h1 className="text-3xl font-bold">Content administration</h1>
    <p className="glass-panel rounded-2xl p-5 text-sm text-zinc-300">Only add media that you own, have licensed, or are authorized to distribute. Delisting a title disables its detail and playback endpoints immediately and prevents the crawler from republishing it.</p>
    <div className="space-y-3">{titles.map((title) => <div key={title.id} className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
      <div><h2 className="font-bold">{title.name}</h2><p className="mt-1 text-sm text-zinc-400">{title.type} · {title.status} · {title._count.streams} movie sources · {title._count.seasons} seasons</p></div>
      <form action={setPublication}><input type="hidden" name="id" value={title.id} /><input type="hidden" name="status" value={title.status === "PUBLISHED" ? "ARCHIVED" : "PUBLISHED"} /><button className="media-focus rounded-full border border-white/10 px-4 py-2 text-sm font-bold">{title.status === "PUBLISHED" ? "Delist" : "Publish"}</button></form>
    </div>)}</div>
  </div>;
}
