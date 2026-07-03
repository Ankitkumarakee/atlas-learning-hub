import { ContentCard } from "@/components/shared/ContentCard";
import { cn } from "@/lib/utils";
import type { ContentCardItem } from "@/types";

interface RelatedContentSectionProps {
  title: string;
  items: ContentCardItem[];
  /** "grid" renders a responsive grid; "scroll" renders a horizontal scroll rail. */
  layout?: "grid" | "scroll";
  className?: string;
  ocid?: string;
}

/**
 * Section wrapper that renders related content as a grid or horizontal scroll rail.
 * Each item is rendered via the shared ContentCard.
 */
export function RelatedContentSection({
  title,
  items,
  layout = "grid",
  className,
  ocid = "related",
}: RelatedContentSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className={cn("space-y-4", className)} data-ocid={ocid}>
      <h2 className="font-display text-xl font-semibold text-foreground">
        {title}
      </h2>

      {layout === "scroll" ? (
        <div
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:thin]"
          data-ocid={`${ocid}.list`}
        >
          {items.map((item, idx) => (
            <div
              key={item.id.toString()}
              className="w-[280px] shrink-0 snap-start sm:w-[320px]"
              data-ocid={`${ocid}.item.${idx + 1}`}
            >
              <ContentCard item={item} />
            </div>
          ))}
        </div>
      ) : (
        <div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          data-ocid={`${ocid}.list`}
        >
          {items.map((item, idx) => (
            <div key={item.id.toString()} data-ocid={`${ocid}.item.${idx + 1}`}>
              <ContentCard item={item} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
