import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantMap: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-600 active:bg-primary-700",
  secondary: "bg-ink text-white hover:bg-dark-800",
  outline:
    "border border-line bg-surface text-ink hover:border-primary hover:text-primary",
  ghost: "bg-transparent text-ink hover:bg-surface-muted",
  danger: "bg-danger text-white hover:brightness-95",
  link: "bg-transparent text-primary underline-offset-4 hover:underline",
};

const sizeMap: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 px-4 text-sm",
  md: "h-11 gap-2 px-6 text-sm",
  lg: "h-13 gap-2 px-8 text-base",
  icon: "size-11 gap-0",
};

interface ButtonVariantOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

/**
 * buttonVariants — returns the class string for a button appearance without a
 * `<button>`. Use it to style links (`<Link className={buttonVariants(...)}>`)
 * or any element that should look like a button.
 */
export function buttonVariants({
  variant = "primary",
  size = "md",
  fullWidth = false,
}: ButtonVariantOptions = {}): string {
  return cn(
    "inline-flex items-center justify-center rounded-pill font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50",
    variant === "link" && "rounded-none px-0",
    variant !== "link" && sizeMap[size],
    variantMap[variant],
    fullWidth && "w-full",
  );
}

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantOptions {
  /** Icon rendered before the label. */
  leftIcon?: ReactNode;
  /** Icon rendered after the label. */
  rightIcon?: ReactNode;
  /** Show a spinner and disable the button. */
  loading?: boolean;
}

/**
 * Button — the primary action primitive. Six variants, four sizes, optional
 * leading/trailing icons and a loading state. Defaults to `type="button"` so it
 * never submits a form by accident.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    fullWidth,
    leftIcon,
    rightIcon,
    loading = false,
    disabled,
    className,
    children,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
