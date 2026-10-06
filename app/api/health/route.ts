export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      ok: true,
      service: "pinflix",
      catalog: {
        provider: "moviebox",
        host: "movibox.net",
      },
      playback: {
        provider: "moviebox",
        host: "movibox.net",
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
