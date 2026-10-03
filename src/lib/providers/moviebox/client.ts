import "server-only";

import type {
  MovieBoxHomeRequest,
  MovieBoxRawResponse,
  MovieBoxSearchRequest,
  MovieBoxSubjectDetail,
} from "./types";

export const MOVIEBOX_ENDPOINTS = {
  tabs: "/wefeed-mobile-bff/tab-api/all",
  tabContents: "/wefeed-mobile-bff/tab-operating",
  details: "/wefeed-mobile-bff/subject-api/get",
  playback: "/wefeed-mobile-bff/subject-api/play-info",
  dubInfo: "/wefeed-mobile-bff/subject-api/dub-info",
  subtitles: "/wefeed-mobile-bff/subject-api/get-ext-captions",
  search: "/wefeed-mobile-bff/subject-api/search",
  home: "/home/v2/get-list",
  filters: "/wefeed-mobile-bff/subject-api/filter-items",
} as const;

export class MovieBoxError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "MovieBoxError";
  }
}

export function isMovieBoxConfigured() {
  return Boolean(
    process.env.MOVIEBOX_API_BASE &&
      process.env.MOVIEBOX_AUTH_HEADER &&
      process.env.MOVIEBOX_AUTH_VALUE,
  );
}

function getConfig() {
  const baseUrl = process.env.MOVIEBOX_API_BASE?.trim();
  const authHeader = process.env.MOVIEBOX_AUTH_HEADER?.trim();
  const authValue = process.env.MOVIEBOX_AUTH_VALUE?.trim();

  if (!baseUrl || !authHeader || !authValue) {
    throw new MovieBoxError(
      "MovieBox authorized API configuration is incomplete. Set MOVIEBOX_API_BASE, MOVIEBOX_AUTH_HEADER and MOVIEBOX_AUTH_VALUE.",
    );
  }

  return { baseUrl: baseUrl.replace(/\/$/, ""), authHeader, authValue };
}

async function movieBoxFetch<T>(
  path: string,
  init: RequestInit = {},
  searchParams: Record<string, string | number | undefined> = {},
): Promise<T> {
  const { baseUrl, authHeader, authValue } = getConfig();
  const url = new URL(path, `${baseUrl}/`);

  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set(authHeader, authValue);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
    redirect: "manual",
  });

  if (!response.ok) {
    throw new MovieBoxError(`MovieBox request failed (${response.status}).`, response.status);
  }

  return response.json() as Promise<T>;
}

export function fetchMovieBoxHome(body: MovieBoxHomeRequest) {
  return movieBoxFetch<MovieBoxRawResponse>(MOVIEBOX_ENDPOINTS.home, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function searchMovieBox(body: MovieBoxSearchRequest) {
  return movieBoxFetch<MovieBoxRawResponse>(MOVIEBOX_ENDPOINTS.search, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchMovieBoxSubject(subjectId: number, host?: string) {
  return movieBoxFetch<MovieBoxSubjectDetail>(
    MOVIEBOX_ENDPOINTS.details,
    { method: "GET" },
    { subjectId, host },
  );
}

/**
 * Returns the raw authorized provider response only.
 *
 * The supplied research says protected playback contains provider-controlled
 * authentication material and is not directly browser-playable. PinFlix does
 * not decode, transform, inject, or proxy that protected material here.
 */
export function fetchMovieBoxPlaybackRaw(params: {
  subjectId: number;
  se?: number;
  ep?: number;
  quality?: string;
  resourceId?: string;
}) {
  return movieBoxFetch<MovieBoxRawResponse>(
    MOVIEBOX_ENDPOINTS.playback,
    { method: "GET" },
    params,
  );
}
