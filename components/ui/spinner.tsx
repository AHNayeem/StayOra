import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = { sm: "size-4", md: "size-6", lg: "size-9" } as const;

interface SpinnerProps {
  size?: keyof typeof SIZES;
  className?: string;
  /** Accessible label; defaults to "Loading". */
  label?: string;
}

/** Spinner — a spinning loader with an accessible label for busy states. */
export function Spinner({ size = "md", className, label = "Loading" }: SpinnerProps) {
  return (
    <span role="status" aria-live="polite" className={cn("inline-flex", className)}>
      <Loader2 className={cn("animate-spin text-primary", SIZES[size])} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
