export function rewriteManifest(manifest: string, manifestUrl: string) {
  const proxy = (value: string) => `/api/proxy-video?url=${encodeURIComponent(new URL(value, manifestUrl).toString())}`;
  return manifest.split(/\r?\n/).map((line) => {
    const value = line.trim();
    if (!value) return line;
    if (value.startsWith("#")) {
      return line.replace(/(URI\s*=\s*)(["'])(.*?)\2/gi, (_match, prefix: string, quote: string, target: string) => `${prefix}${quote}${proxy(target)}${quote}`);
    }
    return proxy(value);
  }).join("\n");
}
