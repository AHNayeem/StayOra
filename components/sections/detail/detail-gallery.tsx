"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { cn } from "@/lib/utils";

interface DetailGalleryProps {
  images: string[];
  /** Used for alt text, e.g. the listing title. */
  title: string;
  className?: string;
}

/**
 * DetailGallery — the hero image mosaic for a details page with a full-screen
 * lightbox. A large lead image plus up to four thumbnails on desktop; a single
 * image with a "view all" affordance on mobile. The lightbox supports keyboard
 * navigation (←/→/Esc) and locks body scroll while open. Mounts no overlay DOM
 * until opened.
 */
export function DetailGallery({ images, title, className }: DetailGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isOpen = openIndex !== null;
  const count = images.length;

  useLockBodyScroll(isOpen);

  const close = useCallback(() => setOpenIndex(null), []);
  const go = useCallback(
    (dir: 1 | -1) =>
      setOpenIndex((i) => (i === null ? i : (i + dir + count) % count)),
    [count],
  );

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close, go]);

  if (count === 0) return null;

  const [hero, ...thumbs] = images;
  const visibleThumbs = thumbs.slice(0, 4);

  return (
    <div className={className}>
      <div className="grid gap-2 sm:grid-cols-4 sm:grid-rows-2">
        <GalleryTile
          src={hero}
          alt={`${title} — photo 1`}
          onOpen={() => setOpenIndex(0)}
          priority
          className="aspect-[4/3] sm:col-span-2 sm:row-span-2 sm:aspect-auto"
        />
        {visibleThumbs.map((src, i) => {
          const index = i + 1;
          const isLastVisible = i === visibleThumbs.length - 1;
          const hidden = count - (visibleThumbs.length + 1);
          return (
            <GalleryTile
              key={src}
              src={src}
              alt={`${title} — photo ${index + 1}`}
              onOpen={() => setOpenIndex(index)}
              overlayLabel={isLastVisible && hidden > 0 ? `+${hidden} photos` : undefined}
              className="hidden aspect-[4/3] sm:block"
            />
          );
        })}
      </div>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-80 flex flex-col bg-ink/95 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={`${title} gallery`}
          >
            <div className="flex items-center justify-between px-4 py-3 text-white sm:px-6">
              <span className="text-sm font-medium tabular-nums">
                {openIndex + 1} / {count}
              </span>
              <button
                type="button"
                onClick={close}
                aria-label="Close gallery"
                className="grid size-10 place-items-center rounded-full text-white transition-colors hover:bg-white/10"
              >
                <X className="size-6" aria-hidden="true" />
              </button>
            </div>

            <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-6 sm:px-16">
              <Image
                key={images[openIndex]}
                src={images[openIndex]}
                alt={`${title} — photo ${openIndex + 1}`}
                fill
                sizes="100vw"
                className="animate-fade-in object-contain p-2"
              />
              {count > 1 && (
                <>
                  <LightboxArrow side="left" onClick={() => go(-1)} />
                  <LightboxArrow side="right" onClick={() => go(1)} />
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function GalleryTile({
  src,
  alt,
  onOpen,
  overlayLabel,
  priority,
  className,
}: {
  src: string;
  alt: string;
  onOpen: () => void;
  overlayLabel?: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative overflow-hidden rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
      )}
      aria-label={overlayLabel ? `${alt} (${overlayLabel})` : alt}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 640px) 50vw, 100vw"
        priority={priority}
        className="object-cover transition-transform duration-slow ease-out-soft group-hover:scale-105"
      />
      {overlayLabel ? (
        <span className="absolute inset-0 grid place-items-center bg-ink/50 text-base font-semibold text-white">
          {overlayLabel}
        </span>
      ) : (
        <span className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full bg-surface/90 text-ink opacity-0 shadow-card transition-opacity group-hover:opacity-100">
          <Expand className="size-4" aria-hidden="true" />
        </span>
      )}
    </button>
  );
}

function LightboxArrow({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={cn(
        "absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20",
        side === "left" ? "left-2 sm:left-5" : "right-2 sm:right-5",
      )}
    >
      <Icon className="size-6" aria-hidden="true" />
    </button>
  );
}
