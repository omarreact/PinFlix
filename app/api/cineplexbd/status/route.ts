import { probeCineplexConnectivity } from "@/src/lib/providers/cineplexbd/api";
import { getCineplexTaxonomy } from "@/src/lib/providers/cineplexbd";

export async function GET() {
  const [connectivity, taxonomy] = await Promise.all([
    probeCineplexConnectivity(),
    getCineplexTaxonomy(),
  ]);

  return Response.json({
    provider: "cineplexbd",
    upstream: "http://cineplexbd.net",
    connectivity,
    taxonomy: {
      source: taxonomy.source,
      categories: taxonomy.categories.length,
      navigation: taxonomy.navigation.length,
    },
    note:
      taxonomy.source === "fallback"
        ? "Pinflix is using the verified CineplexBD category index because the live navigation could not be fetched from this runtime."
        : "Pinflix is using the live CineplexBD navigation.",
  });
}
