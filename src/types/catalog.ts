export type StreamProtocol = "hls" | "native";

export type SubtitleTrack = {
  label: string;
  language: string;
  url: string;
};

export type StreamSource = {
  url: string;
  quality: string;
  protocol: StreamProtocol;
  priority: number;
  subtitles?: SubtitleTrack[];
};

export type CastMember = {
  id: string;
  name: string;
  character?: string;
  avatar?: string;
  detailPath?: string;
};

export type DubVariant = {
  id: string;
  label: string;
  languageCode?: string;
  original: boolean;
};

export type TrailerInfo = {
  url: string;
  poster?: string;
  durationSeconds?: number;
};

export type Entertainment = {
  id: string;
  slug: string;
  title: string;
  kind: "movie" | "show";
  year?: number;
  rating?: number;
  ratingCount?: number;
  genres: string[];
  backdrop: string;
  poster: string;
  synopsis: string;
  durationSeconds?: number;
  country?: string;
  languages?: string[];
  corner?: string;
  episodes?: number;
  qualities?: string[];
  playable?: boolean;
  upcoming?: boolean;
  cast?: CastMember[];
  dubs?: DubVariant[];
  trailer?: TrailerInfo;
  provider?: string;
  providerId?: string;
  detailUrl?: string;
  category?: string;
  play?: {
    sources: StreamSource[];
    subtitles?: SubtitleTrack[];
  };
};
