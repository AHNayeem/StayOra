import { Quote } from "lucide-react";
import type { Testimonial } from "@/types/content";
import { Avatar } from "@/components/ui/avatar";
import { RatingStars } from "@/components/ui/rating-stars";
import { cn } from "@/lib/utils";

/**
 * TestimonialCard — a customer quote with rating and author. Not media-based, so
 * it's a plain surface rather than the {@link Card} media shell.
 */
export function TestimonialCard({
  testimonial,
  className,
}: {
  testimonial: Testimonial;
  className?: string;
}) {
  const { author, role, location, avatar, rating, body } = testimonial;

  return (
    <figure
      className={cn(
        "relative flex h-full flex-col gap-4 rounded-card border border-line bg-surface p-6 shadow-card",
        className,
      )}
    >
      <Quote className="size-8 text-primary/20" aria-hidden="true" />
      <RatingStars value={rating} size="sm" />
      <blockquote className="flex-1 text-body">
        <p className="line-clamp-5">{body}</p>
      </blockquote>
      <figcaption className="flex items-center gap-3 border-t border-line pt-4">
        <Avatar src={avatar} name={author} size="md" />
        <span className="flex flex-col">
          <span className="font-semibold text-ink">{author}</span>
          {(role || location) && (
            <span className="text-sm text-muted">
              {[role, location].filter(Boolean).join(" · ")}
            </span>
          )}
        </span>
      </figcaption>
    </figure>
  );
}
