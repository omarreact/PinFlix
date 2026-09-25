import { getCineplexTaxonomy } from "@/src/lib/providers/cineplexbd";

export async function GET() {
  const taxonomy = await getCineplexTaxonomy();
  return Response.json({
    source: taxonomy.source,
    navigation: taxonomy.navigation,
    categories: taxonomy.categories,
    counts: {
      navigation: taxonomy.navigation.length,
      movies: taxonomy.categories.filter((item) => item.endpoint === "category.php").length,
      tv: taxonomy.categories.filter((item) => item.endpoint === "tcategory.php").length,
      hindiDubbed: taxonomy.categories.filter((item) => item.group === "hindi-dubbed").length,
      animationsShows: taxonomy.categories.filter((item) => item.group === "animations-shows").length,
      regionalSpecial: taxonomy.categories.filter((item) => item.group === "regional-special").length,
      webSeriesSports: taxonomy.categories.filter((item) => item.group === "web-series-sports").length,
    },
  });
}
