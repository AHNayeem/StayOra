import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/**
 * Global 404 fallback for URLs outside the marketing and dashboard trees.
 * Renders bare (no site chrome) since it lives directly under the root layout;
 * each section provides its own richer not-found within its own chrome.
 */
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="text-[5rem] font-bold leading-none text-primary/20">404</p>
      <h1 className="text-2xl font-bold text-ink">Page not found</h1>
      <p className="max-w-md text-body">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link href="/" className={buttonVariants({ variant: "primary" })}>
        Back to home
      </Link>
    </main>
  );
}
