export function toWebVtt(text: string) {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n|\r/g, "\n").trimStart();
  if (/^WEBVTT(?:\s|$)/.test(normalized)) return normalized;
  return "WEBVTT\n\n" + normalized.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
}
