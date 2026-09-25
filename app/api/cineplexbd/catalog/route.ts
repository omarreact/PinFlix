import { getCategoryPage } from "@/src/lib/providers/cineplexbd";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const categoryId = url.searchParams.get("category")?.trim();
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);

  if (!categoryId) {
    return Response.json({ error: "category is required" }, { status: 400 });
  }

  const result = await getCategoryPage(categoryId, page);
  if (!result) {
    return Response.json({ error: "Unknown CineplexBD category" }, { status: 404 });
  }

  return Response.json(result);
}
