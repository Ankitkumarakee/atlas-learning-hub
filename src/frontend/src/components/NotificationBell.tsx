import { NotificationType } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import type { NotificationType as NT, NotificationView } from "@/types";
import {
  Bell,
  CheckCheck,
  Heart,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";

const typeMeta: Record<
  NT,
  { icon: typeof Bell; className: string; label: string }
> = {
  [NotificationType.like]: {
    icon: Heart,
    className: "text-rose-500",
    label: "Like",
  },
  [NotificationType.comment]: {
    icon: MessageSquare,
    className: "text-sky-500",
    label: "Comment",
  },
  [NotificationType.roleUpgrade]: {
    icon: Sparkles,
    className: "text-amber-500",
    label: "Role upgrade",
  },
  [NotificationType.moderation]: {
    icon: ShieldAlert,
    className: "text-destructive",
    label: "Moderation",
  },
  [NotificationType.systemMessage]: {
    icon: Bell,
    className: "text-primary",
    label: "System",
  },
};

function formatRelative(createdAt: bigint): string {
  const diffMs = Date.now() - Number(createdAt);
  if (diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(Number(createdAt)).toLocaleDateString();
}

export function NotificationBell() {
  const { isSignedIn } = useAuth();
  const { data, isLoading } = useNotifications();
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();
  const [open, setOpen] = useState(false);

  if (!isSignedIn) return null;

  const unread = Number(data?.unreadCount ?? 0n);
  const items = data?.items ?? [];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9"
          aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
          data-ocid="notifications.open_dropdown"
        >
          <Bell className="size-5" aria-hidden />
          {unread > 0 && (
            <Badge
              className="absolute -right-0.5 -top-0.5 size-4 justify-center rounded-full bg-destructive px-0 py-0 text-[10px] font-semibold leading-none text-destructive-foreground"
              data-ocid="notifications.unread_count"
            >
              {unread > 9 ? "9+" : unread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 p-0 sm:w-96"
        data-ocid="notifications.dropdown_menu"
      >
        <div className="flex items-center justify-between px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">
            Notifications
          </DropdownMenuLabel>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              disabled={markAll.isPending}
              onClick={() => markAll.mutate()}
              data-ocid="notifications.mark_all_read_button"
            >
              <CheckCheck className="size-3.5" aria-hidden />
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div
              className="space-y-2 p-3"
              data-ocid="notifications.loading_state"
            >
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3 rounded-md p-2">
                  <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div
              className="flex flex-col items-center gap-2 px-4 py-10 text-center"
              data-ocid="notifications.empty_state"
            >
              <Bell className="size-8 text-muted-foreground/50" aria-hidden />
              <p className="text-sm font-medium">You're all caught up</p>
              <p className="text-xs text-muted-foreground">
                New activity will appear here.
              </p>
            </div>
          ) : (
            <ul className="py-1" data-ocid="notifications.list">
              {items.map((n: NotificationView, i) => {
                const meta = typeMeta[n.notificationType];
                const Icon = meta.icon;
                return (
                  <li key={n.id.toString()}>
                    <DropdownMenuItem
                      className="gap-3 px-3 py-2.5"
                      onClick={() => {
                        if (!n.read) markOne.mutate(n.id);
                      }}
                      data-ocid={`notifications.item.${i + 1}`}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full bg-muted",
                          meta.className,
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm leading-snug",
                            !n.read && "font-semibold",
                          )}
                        >
                          {n.content}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {meta.label} · {formatRelative(n.createdAt)}
                        </p>
                      </div>
                      {!n.read && (
                        <span
                          className="size-2 shrink-0 rounded-full bg-primary"
                          aria-label="Unread"
                        />
                      )}
                    </DropdownMenuItem>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
        {items.length > 0 && (
          <>
            <DropdownMenuSeparator className="m-0" />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center gap-1.5 text-xs text-muted-foreground"
                disabled={markAll.isPending || unread === 0}
                onClick={() => markAll.mutate()}
                data-ocid="notifications.mark_all_read_footer_button"
              >
                <Trash2 className="size-3.5" aria-hidden />
                Clear unread state
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
