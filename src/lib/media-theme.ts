import type { CSSProperties } from "react";

/** Adapted from the PinFlix 3.0 editorial design system.
 * Stable media-specific accents rather than one fixed brand color.
 * No image network work is necessary to produce the palette.
 */
function hash(value: string) {
  let result = 0;
  for (const char of value) result = ((result << 5) - result + char.charCodeAt(0)) | 0;
  return Math.abs(result);
}
export function mediaTheme(seed?: string | null): CSSProperties {
  if (!seed) return {};
  const hue = hash(seed) % 360;
  const accent = `hsl(${hue} 59% 78%)`;
  return {
    "--media-accent": accent,
    "--media-accent-contrast": "#0d171b",
    "--media-wash": `hsl(${hue} 39% 26% / .48)`,
  } as CSSProperties;
}
