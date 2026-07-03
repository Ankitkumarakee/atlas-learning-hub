import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import type { ContentCardItem } from "@/types";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Download,
  Eye,
  FileText,
  Heart,
  PlayCircle,
} from "lucide-react";

function formatCount(value: bigint | number): string {
  const n = typeof value === "bigint" ? Number(value) : value;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(ts: bigint | number): string {
  const ms = typeof ts === "bigint" ? Number(ts) : ts;
  if (!ms) return "";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const kindMeta: Record<
  ContentCardItem["kind"],
  { icon: typeof FileText; label: string; href: (id: string) => string }
> = {
  blog: { icon: BookOpen, label: "Blog", href: (id) => `/blogs/${id}` },
  note: { icon: FileText, label: "Note", href: (id) => `/notes/${id}` },
  video: { icon: PlayCircle, label: "Video", href: (id) => `/videos/${id}` },
};

export function ContentCard({ item }: { item: ContentCardItem }) {
  const meta = kindMeta[item.kind];
  const Icon = meta.icon;
  const id = item.id.toString();
  const href = meta.href(id);

  return (
    <Card className="group flex h-full flex-col overflow-hidden border-border/60 bg-card transition-smooth hover:border-primary/40 hover:shadow-md">
      <Link
        to={href}
        className="flex h-full flex-col"
        data-ocid={`content.card.${item.kind}`}
      >
        <div className="relative aspect-video w-full overflow-hidden bg-muted/40">
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
              <Icon className="size-10 text-primary/40" aria-hidden />
            </div>
          )}
          <div className="absolute left-3 top-3">
            <Badge
              variant="secondary"
              className="bg-background/80 text-foreground backdrop-blur-sm"
            >
              <Icon className="mr-1 size-3" aria-hidden />
              {meta.label}
            </Badge>
          </div>
          {item.kind === "video" && item.isShort && (
            <div className="absolute right-3 top-3">
              <Badge className="bg-accent text-accent-foreground">Short</Badge>
            </div>
          )}
        </div>

        <CardHeader className="pb-2">
          <h3 className="line-clamp-2 font-display text-lg font-semibold leading-snug text-foreground">
            {item.title}
          </h3>
        </CardHeader>

        <CardContent className="flex-1 pb-3">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {item.excerpt}
          </p>
          {item.tags && item.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-xs font-normal"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-border/40 pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="size-6">
              <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                {initials(item.author || "U")}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs text-muted-foreground">
              {item.author}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1" title="Likes">
              <Heart className="size-3" aria-hidden />
              {formatCount(item.likeCount)}
            </span>
            {item.viewCount !== undefined && (
              <span className="flex items-center gap-1" title="Views">
                <Eye className="size-3" aria-hidden />
                {formatCount(item.viewCount)}
              </span>
            )}
            {item.downloadCount !== undefined && (
              <span className="flex items-center gap-1" title="Downloads">
                <Download className="size-3" aria-hidden />
                {formatCount(item.downloadCount)}
              </span>
            )}
          </div>
        </CardFooter>
      </Link>
    </Card>
  );
}

export { formatCount, formatDate };
