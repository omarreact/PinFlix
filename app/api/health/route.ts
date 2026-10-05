export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      ok: true,
      service: "pinflix",
      catalog: {
        provider: "cineplexbd",
      },
      playback: {
        provider: "cineplexbd",
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
