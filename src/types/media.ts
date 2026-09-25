export type RecentItem = {
  id: string;
  title: string;
  kind: "channel" | "movie" | "show";
  href: string;
  image: string;
  progress?: number;
  updatedAt: number;
};

export type HomeData = {
  featured: string[];
  categories: string[];
  hotChannelIds: string[];
  recent: RecentItem[];
};
