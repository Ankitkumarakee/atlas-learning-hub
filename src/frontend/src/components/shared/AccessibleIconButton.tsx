import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  forwardRef,
} from "react";

interface AccessibleIconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  icon: LucideIcon;
  /** Required accessible label — enforces screen-reader naming. */
  label: string;
  /** Optional visible tooltip text; defaults to `label`. */
  tooltip?: string;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "outline" | "solid";
  pressed?: boolean;
  /** Stable marker id, e.g. `note.bookmark_button.1`. */
  ocid?: string;
}

const sizeClasses: Record<
  NonNullable<AccessibleIconButtonProps["size"]>,
  string
> = {
  sm: "size-8 [&_svg]:size-4",
  md: "size-9 [&_svg]:size-5",
  lg: "size-11 [&_svg]:size-6",
};

const variantClasses: Record<
  NonNullable<AccessibleIconButtonProps["variant"]>,
  string
> = {
  ghost: "hover:bg-accent hover:text-accent-foreground",
  outline: "border border-border bg-background hover:bg-muted",
  solid: "bg-primary text-primary-foreground hover:bg-primary/90",
};

/**
 * Accessible icon-only button wrapper. Enforces an `aria-label`, visible
 * focus-visible ring, 44px+ hit target on mobile, and keyboard activation
 * (Enter/Space handled natively by <button>, but we normalize Space which
 * some custom setups drop). Use this for any icon-only interactive control.
 */
export const AccessibleIconButton = forwardRef<
  HTMLButtonElement,
  AccessibleIconButtonProps
>(function AccessibleIconButton(
  {
    icon: Icon,
    label,
    tooltip,
    size = "md",
    variant = "ghost",
    pressed,
    className,
    ocid,
    onClick,
    type = "button",
    ...rest
  },
  ref,
) {
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    // Ensure Space triggers click consistently (some custom wrappers swallow it).
    if (e.key === " ") {
      e.preventDefault();
      (e.currentTarget as HTMLButtonElement).click();
    }
  };

  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      aria-pressed={pressed}
      title={tooltip ?? label}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      data-ocid={ocid}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md transition-smooth",
        "focus-ring min-h-11 min-w-11 sm:min-h-9 sm:min-w-9",
        "disabled:pointer-events-none disabled:opacity-50",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...rest}
    >
      <Icon aria-hidden />
    </button>
  );
});
