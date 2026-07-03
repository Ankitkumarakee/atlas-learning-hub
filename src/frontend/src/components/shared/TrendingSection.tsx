import { ContentCard } from "@/components/shared/ContentCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ContentCardItem } from "@/types";
import { Flame } from "lucide-react";

interface TrendingSectionProps {
  title?: string;
  items: ContentCardItem[];
  className?: string;
  ocid?: string;
}

function formatCount(value: bigint | number): string {
  const n = typeof value === "bigint" ? Number(value) : value;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Rank badge color escalates with position: gold, silver, bronze, then neutral. */
function rankBadgeClass(rank: number): string {
  if (rank === 1) return "border-accent/50 bg-accent/15 text-accent";
  if (rank === 2) return "border-primary/40 bg-primary/10 text-primary";
  if (rank === 3) return "border-chart-1/40 bg-chart-1/10 text-chart-1";
  return "border-border bg-muted text-muted-foreground";
}

/**
 * Home-page trending section: ranked list of trending content with rank badges
 * and engagement counts. Top 3 items get an elevated card + accent badge.
 */
export function TrendingSection({
  title = "Trending now",
  items,
  className,
  ocid = "trending",
}: TrendingSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className={cn("space-y-5", className)} data-ocid={ocid}>
      <div className="flex items-center gap-2">
        <Flame className="size-5 text-accent" aria-hidden />
        <h2 className="font-display text-xl font-semibold text-foreground">
          {title}
        </h2>
      </div>

      <div
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        data-ocid={`${ocid}.list`}
      >
        {items.map((item, idx) => {
          const rank = idx + 1;
          const isTop = rank <= 3;
          return (
            <div
              key={item.id.toString()}
              className={cn("relative", isTop && "lg:scale-[1.02]")}
              data-ocid={`${ocid}.item.${rank}`}
            >
              <div className="absolute -left-2 -top-2 z-10">
                <Badge
                  variant="outline"
                  className={cn(
                    "size-7 justify-center rounded-full p-0 text-xs font-bold tabular-nums shadow-xs",
                    rankBadgeClass(rank),
                  )}
                  aria-label={`Rank ${rank}`}
                >
                  {rank}
                </Badge>
              </div>
              <ContentCard item={item} />
              <p className="mt-2 px-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {formatCount(item.likeCount)}
                </span>{" "}
                likes
                {item.viewCount !== undefined && (
                  <>
                    {" · "}
                    <span className="font-medium text-foreground">
                      {formatCount(item.viewCount)}
                    </span>{" "}
                    views
                  </>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
