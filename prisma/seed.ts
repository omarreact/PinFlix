import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  await prisma.watchEvent.deleteMany();
  await prisma.watchProgress.deleteMany();
  await prisma.myList.deleteMany();
  await prisma.subtitleTrack.deleteMany();
  await prisma.streamSource.deleteMany();
  await prisma.episode.deleteMany();
  await prisma.season.deleteMany();
  await prisma.titleGenre.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.title.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.user.deleteMany();
  await prisma.appSetting.deleteMany();

  const genres = await Promise.all([
    prisma.genre.upsert({ where: { name: "Action" }, update: {}, create: { name: "Action", slug: "action" } }),
    prisma.genre.upsert({ where: { name: "Sci‑Fi" }, update: {}, create: { name: "Sci‑Fi", slug: "sci-fi" } }),
    prisma.genre.upsert({ where: { name: "Drama" }, update: {}, create: { name: "Drama", slug: "drama" } }),
    prisma.genre.upsert({ where: { name: "Family" }, update: {}, create: { name: "Family", slug: "family" } }),
    prisma.genre.upsert({ where: { name: "Mystery" }, update: {}, create: { name: "Mystery", slug: "mystery" } }),
    prisma.genre.upsert({ where: { name: "Documentary" }, update: {}, create: { name: "Documentary", slug: "documentary" } }),
  ]);

  const freePlan = await prisma.plan.create({
    data: { slug: "free", name: "Free", priceMonthlyCents: 0, maxProfiles: 2, maxStreams: 1, maxQuality: "720p" },
  });

  const premiumPlan = await prisma.plan.create({
    data: { slug: "premium", name: "Premium", priceMonthlyCents: 1499, maxProfiles: 5, maxStreams: 3, maxQuality: "1080p" },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      passwordHash: bcrypt.hashSync("Admin123!", 10),
      name: "Admin User",
      role: "ADMIN",
    },
  });

  const viewer = await prisma.user.create({
    data: {
      email: "viewer@example.com",
      passwordHash: bcrypt.hashSync("Viewer123!", 10),
      name: "Viewer User",
      role: "USER",
    },
  });

  await prisma.profile.createMany({
    data: [
      { userId: admin.id, name: "Main", avatar: "A", isKids: false },
      { userId: viewer.id, name: "Main", avatar: "V", isKids: false },
    ],
  });

  await prisma.subscription.create({
    data: {
      userId: viewer.id,
      planId: premiumPlan.id,
      provider: "DEMO",
      status: "ACTIVE",
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const movieTitles = [
    { slug: "big-buck-bunny-demo", name: "Big Buck Bunny — Demo", originalName: "Big Buck Bunny", type: "MOVIE", overview: "A playful rabbit navigates a mischievous world in a demo motion picture built for testing playback and quality failover.", releaseYear: 2008, runtimeMinutes: 9, maturityRating: "G", featured: true, posterPath: "/posters/big-buck-bunny.svg", backdropPath: "/backdrops/big-buck-bunny.svg", country: "US", language: "EN", genres: ["Family", "Animation"], rating: 8.1 },
    { slug: "signal-beyond-demo", name: "Signal Beyond", originalName: "Signal Beyond", type: "MOVIE", overview: "A deep-space crew decodes a repeating transmission that seems to forecast the future with chilling precision.", releaseYear: 2023, runtimeMinutes: 118, maturityRating: "PG-13", featured: true, posterPath: "/posters/signal-beyond.svg", backdropPath: "/backdrops/signal-beyond.svg", country: "US", language: "EN", genres: ["Sci‑Fi", "Mystery"], rating: 8.5 },
    { slug: "city-of-harbor-demo", name: "City of Harbor", originalName: "City of Harbor", type: "MOVIE", overview: "A marine salvage diver uncovers a hidden network of old tunnels beneath a storm-battered port city.", releaseYear: 2021, runtimeMinutes: 111, maturityRating: "PG-13", featured: false, posterPath: "/posters/city-of-harbor.svg", backdropPath: "/backdrops/city-of-harbor.svg", country: "US", language: "EN", genres: ["Drama", "Mystery"], rating: 7.9 },
    { slug: "green-echo-demo", name: "Green Echo", originalName: "Green Echo", type: "MOVIE", overview: "A botanist in a remote valley discovers a rare organism that hums with a nearly impossible rhythm.", releaseYear: 2022, runtimeMinutes: 104, maturityRating: "PG", featured: false, posterPath: "/posters/green-echo.svg", backdropPath: "/backdrops/green-echo.svg", country: "US", language: "EN", genres: ["Drama", "Documentary"], rating: 7.7 },
    { slug: "night-commuter-demo", name: "Night Commuter", originalName: "Night Commuter", type: "MOVIE", overview: "After a midnight train is canceled, a lonely writer follows the last route home into a city of strangers.", releaseYear: 2024, runtimeMinutes: 97, maturityRating: "PG-13", featured: false, posterPath: "/posters/night-commuter.svg", backdropPath: "/backdrops/night-commuter.svg", country: "US", language: "EN", genres: ["Action", "Drama"], rating: 8.2 },
    { slug: "atlas-at-dawn-demo", name: "Atlas at Dawn", originalName: "Atlas at Dawn", type: "MOVIE", overview: "A cartographer returning home confronts a layered map of betrayals and forgotten roads.", releaseYear: 2020, runtimeMinutes: 109, maturityRating: "PG-13", featured: false, posterPath: "/posters/atlas-at-dawn.svg", backdropPath: "/backdrops/atlas-at-dawn.svg", country: "US", language: "EN", genres: ["Adventure", "Mystery"], rating: 7.8 },
  ] as const;

  for (const titleData of movieTitles) {
    const title = await prisma.title.create({
      data: {
        slug: titleData.slug,
        name: titleData.name,
        originalName: titleData.originalName,
        type: titleData.type,
        status: "PUBLISHED",
        overview: titleData.overview,
        releaseYear: titleData.releaseYear,
        runtimeMinutes: titleData.runtimeMinutes,
        maturityRating: titleData.maturityRating,
        featured: titleData.featured,
        trendingScore: 80 + titleData.rating * 5,
        rating: titleData.rating,
        ratingCount: 1200,
        posterPath: titleData.posterPath,
        backdropPath: titleData.backdropPath,
        country: titleData.country,
        language: titleData.language,
      },
    });

    for (const genreName of titleData.genres) {
      const genre = await prisma.genre.upsert({
        where: { name: genreName },
        update: {},
        create: { name: genreName, slug: genreName.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
      });
      await prisma.titleGenre.upsert({
        where: { titleId_genreId: { titleId: title.id, genreId: genre.id } },
        update: {},
        create: { titleId: title.id, genreId: genre.id },
      });
    }

    const sources = [
      { titleId: title.id, label: "Auto HLS", protocol: "HLS", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", qualityLabel: "Auto", isDefault: true, priority: 100, isActive: true },
      { titleId: title.id, label: "720p MP4", protocol: "MP4", url: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", qualityLabel: "720p", isDefault: false, priority: 80, isActive: true },
    ];

    await prisma.streamSource.createMany({ data: sources });
  }

  const seriesTitle = await prisma.title.create({
    data: {
      slug: "orbital-echo-demo",
      name: "Orbital Echo",
      originalName: "Orbital Echo",
      type: "SERIES",
      status: "PUBLISHED",
      overview: "A crew of observatory specialists face a hidden pattern of signals reaching across the solar system.",
      releaseYear: 2024,
      runtimeMinutes: 48,
      maturityRating: "PG-13",
      featured: true,
      trendingScore: 92,
      rating: 8.8,
      ratingCount: 3500,
      posterPath: "/posters/orbital-echo.svg",
      backdropPath: "/backdrops/orbital-echo.svg",
      country: "US",
      language: "EN",
    },
  });

  const sciFiGenre = await prisma.genre.upsert({ where: { name: "Sci‑Fi" }, update: {}, create: { name: "Sci‑Fi", slug: "sci-fi" } });
  const dramaGenre = await prisma.genre.upsert({ where: { name: "Drama" }, update: {}, create: { name: "Drama", slug: "drama" } });

  await prisma.titleGenre.createMany({ data: [
    { titleId: seriesTitle.id, genreId: sciFiGenre.id },
    { titleId: seriesTitle.id, genreId: dramaGenre.id },
  ] });

  for (const [seasonNumber, seasonName] of [[1, "Transmission"], [2, "Afterglow"]] as const) {
    const season = await prisma.season.create({
      data: { titleId: seriesTitle.id, number: seasonNumber, name: seasonName, overview: `Season ${seasonNumber} of Orbital Echo.` },
    });

    for (let episodeNumber = 1; episodeNumber <= 3; episodeNumber++) {
      const episode = await prisma.episode.create({
        data: {
          seasonId: season.id,
          number: episodeNumber,
          name: `Episode ${episodeNumber}`,
          overview: `A deep-space signal reveals another layer of the ancient mystery within the station network.`,
          runtimeMinutes: 46,
        },
      });

      await prisma.streamSource.createMany({
        data: [
          { episodeId: episode.id, label: "Auto HLS", protocol: "HLS", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", qualityLabel: "Auto", isDefault: true, priority: 100, isActive: true },
          { episodeId: episode.id, label: "720p MP4", protocol: "MP4", url: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", qualityLabel: "720p", isDefault: false, priority: 80, isActive: true },
        ],
      });
    }
  }

  await prisma.appSetting.createMany({
    data: [
      { key: "app_name", value: "PinFlix" },
      { key: "demo_notice", value: "Only add media you own, have licensed, or are authorized to distribute." },
    ],
  });

  console.log("Seed complete: demo users, plans, titles and streams created.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
