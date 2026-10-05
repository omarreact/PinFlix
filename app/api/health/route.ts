export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      ok: true,
      app: "StreamFlix",
      mode: "demo",
      database: "ok",
      playback: "configured",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
