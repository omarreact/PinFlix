import { prisma } from "@/src/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const publishedTitles = await prisma.title.count({ where: { status: "PUBLISHED" } });
    return Response.json({ ok: true, service: "pinflix", catalog: process.env.CATALOG_PROVIDER ?? "demo", publishedTitles }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, service: "pinflix", reason: "database_unavailable" }, { status: 503 });
  }
}
