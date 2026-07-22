import { CalendarDays, Clock } from "lucide-react";
import type { BlogPost } from "@/types/content";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardBody,
  CardFooter,
  CardMedia,
  CardMetaList,
  CardTitle,
} from "@/components/ui/card";

/** Format an ISO date as "18 Jun 2026". */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** BlogCard — article teaser: category, meta, title, excerpt and author. */
export function BlogCard({ post, className }: { post: BlogPost; className?: string }) {
  return (
    <Card className={className}>
      <CardMedia
        src={post.image}
        alt={post.title}
        aspect="video"
        badges={<Badge variant="dark">{post.category}</Badge>}
      />
      <CardBody>
        <CardMetaList
          items={[
            { icon: CalendarDays, label: formatDate(post.date) },
            { icon: Clock, label: `${post.readMinutes} min read` },
          ]}
        />
        <CardTitle href={`/blog/${post.slug}`}>{post.title}</CardTitle>
        <p className="line-clamp-2 text-sm text-body">{post.excerpt}</p>
      </CardBody>
      <CardFooter className="justify-start gap-2.5">
        <Avatar name={post.author} size="sm" />
        <span className="text-sm font-medium text-ink">{post.author}</span>
      </CardFooter>
    </Card>
  );
}
