export type MediaKind = "channel" | "movie" | "show";

export type StreamProtocol = "hls" | "native" | "mpegts";

export type StreamSource = {
  url: string;
  quality: string;
  protocol: StreamProtocol;
  priority: number;
  subtitles?: SubtitleTrack[];
};

export type SubtitleTrack = {
  label: string;
  language: string;
  url: string;
};

export type EpgNowNext = {
  now?: string;
  next?: string;
};

export type ChannelPreview = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  category: string;
  groups: string[];
  logo: string;
  description: string;
  accent: string;
  isLive: boolean;
  quality?: string;
  availability: "available" | "limited" | "offline";
  geoFlags?: string[];
  epg?: EpgNowNext;
};

export type Channel = ChannelPreview & {
  streams: StreamSource[];
};

export type Entertainment = {
  id: string;
  slug: string;
  title: string;
  kind: "movie" | "show";
  year: number;
  rating: number;
  genres: string[];
  backdrop: string;
  poster: string;
  synopsis: string;
  episodes?: number;
  play?: {
    sources: StreamSource[];
    subtitles?: SubtitleTrack[];
  };
};
