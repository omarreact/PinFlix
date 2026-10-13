export type DigitalItem = {
  title: string;
  description: string;
  category: string;
  url: string;
};
export const DIGITAL_COLLECTIONS = {
  games: {
    title: "Games",
    action: "Official downloads",
    items: [
      {
        title: "Luanti",
        description:
          "Open-source voxel sandbox with downloadable games and mods.",
        category: "Sandbox",
        url: "https://www.luanti.org/downloads/",
      },
      {
        title: "SuperTuxKart",
        description:
          "Free kart racing game with single-player and multiplayer modes.",
        category: "Racing",
        url: "https://supertuxkart.net/Download",
      },
      {
        title: "0 A.D.",
        description: "Free historical real-time strategy game.",
        category: "Strategy",
        url: "https://play0ad.com/download/",
      },
    ],
  },
  software: {
    title: "Software",
    action: "Official downloads",
    items: [
      {
        title: "VLC media player",
        description: "Free media player for video, music and network streams.",
        category: "Media",
        url: "https://www.videolan.org/vlc/",
      },
      {
        title: "7-Zip",
        description: "Open-source file archiver and compression utility.",
        category: "Utilities",
        url: "https://www.7-zip.org/download.html",
      },
      {
        title: "LibreOffice",
        description:
          "Free office suite for documents, spreadsheets and presentations.",
        category: "Productivity",
        url: "https://www.libreoffice.org/download/download-libreoffice/",
      },
    ],
  },
  tutorials: {
    title: "Tutorials",
    action: "Open tutorial",
    items: [
      {
        title: "MDN Web Development",
        description:
          "Learn HTML, CSS and JavaScript through guided web-development lessons.",
        category: "Web development",
        url: "https://developer.mozilla.org/en-US/docs/Learn_web_development",
      },
      {
        title: "freeCodeCamp",
        description: "Free interactive programming courses and projects.",
        category: "Programming",
        url: "https://www.freecodecamp.org/learn/",
      },
      {
        title: "Godot Introduction",
        description:
          "Official getting-started guide for the Godot game engine.",
        category: "Game development",
        url: "https://docs.godotengine.org/en/stable/getting_started/introduction/index.html",
      },
    ],
  },
} satisfies Record<
  string,
  { title: string; action: string; items: DigitalItem[] }
>;
export type DigitalSection = keyof typeof DIGITAL_COLLECTIONS;
