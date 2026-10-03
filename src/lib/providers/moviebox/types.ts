/**
 * Only fields and request shapes supported by the supplied MovieBox research
 * are represented here. Add fields only after an authorized raw response is
 * captured and verified.
 */

export type MovieBoxHomeRequest = {
  categoryId: number;
  page: number;
  pageSize: number;
};

export type MovieBoxSearchRequest = {
  keyword: string;
  type: number;
  page: number;
  pageSize: number;
};

export type MovieBoxSubjectListItem = {
  subjectId: number;
  seeTime?: number;
  totalTime?: number;
  status?: number;
};

export type MovieBoxSubjectDetail = {
  subjectId: number;
  resourceDetectors?: unknown[];
  cast?: unknown[];
  quality?: string;
  list?: MovieBoxSubjectListItem[];
};

export type MovieBoxEpisodeRequest = {
  subjectId: number;
  se: number;
  ep: number;
  quality?: string;
  resourceId?: string;
};

export type MovieBoxRawResponse = Record<string, unknown>;
