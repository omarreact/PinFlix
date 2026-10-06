export type StreamProtocol = "hls" | "native" | "embed";

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

export type CastCredit = {
  name: string;
  role?: string;
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
  episodes?: number;
  durationMinutes?: number;
  country?: string;
  languages?: string[];
  cast?: CastCredit[];
  collections?: string[];
  provider?: string;
  providerId?: string;
  detailUrl?: string;
  category?: string;
  play?: {
    sources: StreamSource[];
    subtitles?: SubtitleTrack[];
  };
};
