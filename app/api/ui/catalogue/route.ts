import { sourceCatalogue } from "@/src/lib/source-ui-catalogue";
export const runtime = "nodejs";
export const preferredRegion = "sin1";
export async function GET(request: Request) {
  try {
    const result = await sourceCatalogue(new URL(request.url).searchParams);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("UI catalogue unavailable:", error);
    return Response.json(
      { error: "This collection could not be loaded. Please try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
