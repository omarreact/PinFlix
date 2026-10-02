export type StreamProtocol = "hls" | "native";

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

export type Entertainment = {
  id: string;
  slug: string;
  title: string;
  kind: "movie" | "show";
  year?: number;
  rating?: number;
  genres: string[];
  backdrop: string;
  poster: string;
  synopsis: string;
  episodes?: number;
  provider?: string;
  providerId?: string;
  detailUrl?: string;
  category?: string;
  play?: {
    sources: StreamSource[];
    subtitles?: SubtitleTrack[];
  };
};
