"use client";

import Image from "next/image";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";

/** Shipped in /public/images — a themed, always-loadable graceful fallback. */
const DEFAULT_FALLBACK = "/images/placeholder.svg";

type CardImageProps = Omit<ComponentProps<typeof Image>, "src"> & {
  src?: string | null;
  /** Image shown when `src` is missing or fails to load. */
  fallbackSrc?: string;
};

/**
 * CardImage — a client wrapper around next/image that degrades gracefully:
 * a missing or broken `src` swaps to `fallbackSrc` instead of throwing or
 * rendering a broken image. Fallbacks render `unoptimized` so an SVG (or any
 * host not in `images.remotePatterns`) can't error a second time.
 */
export function CardImage({ src, fallbackSrc = DEFAULT_FALLBACK, alt, ...props }: CardImageProps) {
  const initial = src || fallbackSrc;
  const [current, setCurrent] = useState(initial);

  // Keep in sync if the parent later supplies a real src.
  useEffect(() => setCurrent(src || fallbackSrc), [src, fallbackSrc]);

  const isFallback = current === fallbackSrc;

  return (
    <Image
      {...props}
      src={current}
      alt={alt}
      unoptimized={props.unoptimized ?? isFallback}
      onError={() => {
        if (!isFallback) setCurrent(fallbackSrc);
      }}
    />
  );
}
