import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  /** Optional label announced to screen readers. */
  label?: string;
  className?: string;
  ocid?: string;
}

/**
 * Animated three-dot typing indicator for the AI Tutor while waiting for a
 * response. Uses the `.typing-dot` keyframe defined in index.css and honors
 * `prefers-reduced-motion` (animation disabled via media query).
 */
export function TypingIndicator({
  label = "Assistant is typing",
  className,
  ocid = "typing_indicator",
}: TypingIndicatorProps) {
  return (
    <output
      className={cn(
        "flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-muted px-4 py-3",
        className,
      )}
      aria-live="polite"
      aria-label={label}
      data-ocid={ocid}
    >
      <span className="typing-dot size-2 rounded-full bg-muted-foreground/70" />
      <span className="typing-dot size-2 rounded-full bg-muted-foreground/70" />
      <span className="typing-dot size-2 rounded-full bg-muted-foreground/70" />
      <span className="sr-only">{label}</span>
    </output>
  );
}
