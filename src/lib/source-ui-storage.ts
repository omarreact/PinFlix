export function read<T>(key: string, fallback: T): T {
  try {
    return (
      JSON.parse(localStorage.getItem(`pinflix-ui-${key}`) ?? "null") ??
      fallback
    );
  } catch {
    return fallback;
  }
}
export function write(key: string, value: unknown) {
  try {
    localStorage.setItem(`pinflix-ui-${key}`, JSON.stringify(value));
  } catch {
    /* Private browsing may disable storage. */
  }
}
