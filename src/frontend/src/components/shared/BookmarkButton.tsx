import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bookmark } from "lucide-react";
import { useState } from "react";

interface BookmarkButtonProps {
  bookmarked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  size?: "sm" | "default";
  ocid?: string;
  label?: string;
}

export function BookmarkButton({
  bookmarked,
  onToggle,
  disabled,
  size = "sm",
  ocid,
  label,
}: BookmarkButtonProps) {
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (disabled || pending) return;
    setPending(true);
    try {
      onToggle();
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size={size === "sm" ? "sm" : "default"}
      disabled={disabled || pending}
      onClick={handleClick}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
      data-ocid={ocid}
      className={cn(
        "gap-1.5 text-muted-foreground hover:text-primary",
        bookmarked && "text-primary hover:text-primary",
      )}
    >
      <Bookmark
        className={cn("size-4 transition-smooth", bookmarked && "fill-primary")}
        aria-hidden
      />
      {label && <span>{label}</span>}
    </Button>
  );
}
