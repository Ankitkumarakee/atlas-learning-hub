import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";
import { useState } from "react";

interface LikeButtonProps {
  liked: boolean;
  count: bigint | number;
  onToggle: () => void;
  disabled?: boolean;
  size?: "sm" | "default";
  /** Stable marker id, e.g. `blog.like_button.1`. */
  ocid?: string;
}

export function LikeButton({
  liked,
  count,
  onToggle,
  disabled,
  size = "sm",
  ocid,
}: LikeButtonProps) {
  const [pending, setPending] = useState(false);
  const n = typeof count === "bigint" ? Number(count) : count;

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
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
      data-ocid={ocid}
      className={cn(
        "gap-1.5 text-muted-foreground hover:text-accent",
        liked && "text-accent hover:text-accent",
      )}
    >
      <Heart
        className={cn("size-4 transition-smooth", liked && "fill-accent")}
        aria-hidden
      />
      <span className="tabular-nums">{n}</span>
    </Button>
  );
}
