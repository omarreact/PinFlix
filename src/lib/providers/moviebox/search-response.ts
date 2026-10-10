/** Normalize provider search responses without assuming a single envelope.
 * A recognised empty collection is different from an unexpected upstream
 * response; never silently turn malformed or blocked responses into "0 hits".
 */
export function extractSearchItems(input: unknown): unknown[] | null {
  if (Array.isArray(input)) return input;
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;
  for (const key of ["items", "subjects", "results", "list"]) {
    if (Array.isArray(obj[key])) return obj[key] as unknown[];
  }
  for (const key of ["data", "result", "page"]) {
    const value = obj[key];
    if (value && typeof value === "object") {
      const nested = extractSearchItems(value);
      if (nested) return nested;
    }
  }
  return null;
}

type SearchSubject = Record<string, unknown>;
export function validSearchSubject(value: unknown): value is SearchSubject {
  if (!value || typeof value !== "object") return false;
  const item = value as SearchSubject;
  const subject = item.subject && typeof item.subject === "object"
    ? item.subject as SearchSubject : item;
  const id = subject.subjectId ?? item.subjectId;
  const title = subject.title ?? item.title;
  const type = subject.subjectType ?? item.subjectType;
  return (typeof id === "string" && /^\d+$/.test(id) || typeof id === "number" && Number.isSafeInteger(id) && id > 0)
    && typeof title === "string" && title.trim().length > 0
    && (type === undefined || type === null || Number(type) === 1 || Number(type) === 2);
}
