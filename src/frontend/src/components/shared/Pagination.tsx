import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
  ocid?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
  ocid = "pagination",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = page + 1;
  const canPrev = page > 0;
  const canNext = current < totalPages;

  return (
    <div
      className={cn("flex items-center justify-center gap-2", className)}
      data-ocid={ocid}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canPrev}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
        data-ocid={`${ocid}.pagination_prev`}
      >
        <ChevronLeft className="size-4" aria-hidden />
        Prev
      </Button>
      <span className="text-sm text-muted-foreground">
        Page <span className="font-medium text-foreground">{current}</span> of{" "}
        <span className="font-medium text-foreground">{totalPages}</span>
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canNext}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
        data-ocid={`${ocid}.pagination_next`}
      >
        Next
        <ChevronRight className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
