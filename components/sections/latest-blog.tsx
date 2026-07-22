import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BlogPost } from "@/types/content";
import { BlogCard } from "@/components/cards/blog-card";
import { buttonVariants } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { HOME_SECTIONS } from "@/constants/home";
import { Reveal } from "@/components/shared/reveal";
import { cn } from "@/lib/utils";

/**
 * LatestBlog — the "from the blog" band: a scroll-revealing grid of the most
 * recent posts with a "Read all articles" link.
 */
export function LatestBlog({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) return null;

  return (
    <Section background="surface">
      <SectionHeader
        {...HOME_SECTIONS.blog}
        action={
          <Link
            href="/blogs"
            className={cn(buttonVariants({ variant: "outline", size: "md" }), "gap-2")}
          >
            Read all articles
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, index) => (
          <Reveal key={post.id} step={index % 3} className="h-full">
            <BlogCard post={post} className="h-full" />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
