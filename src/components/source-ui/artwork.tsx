"use client";
import { useState } from "react";
export function Artwork({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return src && failedSrc !== src ? (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      onError={() => setFailedSrc(src)}
    />
  ) : (
    <div role="img" aria-label={alt} className={"art-fallback " + className}>
      <span>
        {alt
          .split(" ")
          .slice(0, 2)
          .map((s) => s[0])
          .join("")}
      </span>
    </div>
  );
}
