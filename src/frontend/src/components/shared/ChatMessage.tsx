import type { Message } from "@/backend";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  message: Message;
  /** Stable 1-based index for deterministic markers. */
  index: number;
}

function formatTime(ts: bigint): string {
  const ms = Number(ts);
  if (!ms) return "";
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatMessage({ message, index }: ChatMessageProps) {
  const isUser = message.role === "user";
  const Icon = isUser ? User : Bot;

  return (
    <div
      className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
      data-ocid={`chat.item.${index}`}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-accent text-accent-foreground",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm bg-muted text-foreground",
        )}
      >
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {message.content}
        </p>
        {message.sources.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-border/40 pt-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Sources
            </p>
            {message.sources.map((src, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: source has no stable id
              <p key={`source-${i}`} className="text-xs text-primary">
                {src.title}
              </p>
            ))}
          </div>
        )}
        <p
          className={cn(
            "mt-1 text-[10px]",
            isUser ? "text-primary-foreground/60" : "text-muted-foreground",
          )}
        >
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
