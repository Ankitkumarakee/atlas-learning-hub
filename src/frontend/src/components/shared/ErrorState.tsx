import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  /** Icon to display. Defaults to a warning triangle. */
  icon?: LucideIcon;
  title?: string;
  message?: string;
  /** Retry button label. Omit to hide the retry button. */
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
  ocid?: string;
}

/**
 * Error state — the complement to EmptyState and LoadingState. Shows an icon,
 * message, and an optional retry button. Used for failed queries/mutations.
 */
export function ErrorState({
  icon: Icon = AlertTriangle,
  title = "Something went wrong",
  message = "We couldn't load this content. Please try again.",
  retryLabel,
  onRetry,
  className,
  ocid = "error_state",
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center",
        className,
      )}
      role="alert"
      data-ocid={ocid}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <Icon className="size-7" aria-hidden />
      </div>
      <div className="space-y-1">
        <h3 className="font-display text-lg font-semibold text-foreground">
          {title}
        </h3>
        {message && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {message}
          </p>
        )}
      </div>
      {retryLabel && onRetry && (
        <Button
          type="button"
          variant="outline"
          onClick={onRetry}
          data-ocid={`${ocid}.retry_button`}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
