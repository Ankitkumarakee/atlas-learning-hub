import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  /** Number of skeleton rows or cards to render. */
  count?: number;
  variant?: "list" | "grid" | "card" | "text";
  className?: string;
  ocid?: string;
}

export function LoadingState({
  count = 3,
  variant = "list",
  className,
  ocid = "loading_state",
}: LoadingStateProps) {
  if (variant === "grid") {
    return (
      <div
        className={cn(
          "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3",
          className,
        )}
        data-ocid={ocid}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={`loading-${i}`}
            className="space-y-3"
            data-ocid={`${ocid}.item.${i + 1}`}
          >
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("space-y-3", className)} data-ocid={ocid}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton
            key={`loading-${i}`}
            className="h-24 w-full rounded-xl"
            data-ocid={`${ocid}.item.${i + 1}`}
          />
        ))}
      </div>
    );
  }

  if (variant === "text") {
    return (
      <div className={cn("space-y-2", className)} data-ocid={ocid}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={`loading-${i}`} className="h-4 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)} data-ocid={ocid}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`loading-${i}`}
          className="flex gap-3"
          data-ocid={`${ocid}.item.${i + 1}`}
        >
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
