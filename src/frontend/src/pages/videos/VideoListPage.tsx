import { VideoSort } from "@/backend";
import { ContentCard } from "@/components/shared/ContentCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Pagination } from "@/components/shared/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVideos } from "@/hooks/useQueries";
import type { Video, VideoFilter } from "@/types";
import type { ContentCardItem } from "@/types";
import { useNavigate } from "@tanstack/react-router";
import { Film, Plus, Search, Sparkles, Video as VideoIcon } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 9n;

const CATEGORIES = [
  "All",
  "Mathematics",
  "Science",
  "Programming",
  "Languages",
  "Humanities",
  "Business",
  "Arts",
  "Other",
] as const;

type TabValue = "all" | "shorts" | "longform";

type CategoryValue = (typeof CATEGORIES)[number];

/* ------------------------------------------------------------------ */
/* Mappers                                                            */
/* ------------------------------------------------------------------ */

function toContentCardItem(v: Video): ContentCardItem {
  return {
    id: v.id,
    kind: "video",
    title: v.title,
    excerpt: v.description,
    author: v.author.toText().slice(0, 8),
    createdAt: v.createdAt,
    likeCount: v.likeCount,
    viewCount: v.viewCount,
    isShort: v.isShort,
    durationSeconds: v.durationSeconds,
    category: v.category,
    thumbnailUrl: v.thumbnailBlobId || undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Shorts card — vertical layout for short-form video                 */
/* ------------------------------------------------------------------ */

function ShortsCard({ item, index }: { item: ContentCardItem; index: number }) {
  const seconds =
    item.durationSeconds !== undefined
      ? Number(item.durationSeconds)
      : undefined;
  const duration = seconds
    ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
    : undefined;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4) }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-smooth hover:border-primary/40 hover:shadow-lg"
      data-ocid={`videos.shorts.item.${index + 1}`}
    >
      <a
        href={`/videos/${item.id.toString()}`}
        className="flex flex-col"
        data-ocid={`videos.shorts.card.${index + 1}`}
      >
        <div className="relative aspect-[9/16] w-full overflow-hidden bg-muted/40">
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
              <VideoIcon className="size-10 text-primary/40" aria-hidden />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/90 px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
              <Sparkles className="size-2.5" aria-hidden />
              Short
            </span>
          </div>
          {duration && (
            <span className="absolute right-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white">
              {duration}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <h3 className="line-clamp-2 font-display text-sm font-semibold leading-snug text-foreground">
            {item.title}
          </h3>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {item.excerpt}
          </p>
          <div className="mt-auto flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
            <span className="truncate">@{item.author}</span>
            <span className="flex items-center gap-2">
              <span>{Number(item.likeCount)} likes</span>
            </span>
          </div>
        </div>
      </a>
    </motion.article>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function VideoListPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabValue>("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryValue>("All");
  const [page, setPage] = useState(0);

  const filter: Partial<VideoFilter> = useMemo(
    () => ({
      page: BigInt(page),
      pageSize: PAGE_SIZE,
      sort: VideoSort.newest,
      ...(tab === "shorts" ? { isShort: true } : {}),
      ...(tab === "longform" ? { isShort: false } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(category !== "All" ? { category } : {}),
    }),
    [tab, search, category, page],
  );

  const { data, isLoading, isFetching } = useVideos(filter);

  const items = data?.items ?? [];
  const total = data ? Number(data.total) : 0;
  const shorts = items.filter((v) => v.isShort);
  const longform = items.filter((v) => !v.isShort);
  const cardItems = items.map(toContentCardItem);

  const handleTabChange = (value: string) => {
    setTab(value as TabValue);
    setPage(0);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value as CategoryValue);
    setPage(0);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header band */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Film className="size-3.5" aria-hidden />
                Video library
              </div>
              <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Watch &amp; learn
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                Browse educational shorts and long-form videos from creators
                across the platform. Free to watch, like, and bookmark.
              </p>
            </div>
            <Button
              onClick={() => navigate({ to: "/videos/new" })}
              data-ocid="videos.upload_button"
              className="self-start lg:self-auto"
            >
              <Plus className="size-4" aria-hidden />
              Upload video
            </Button>
          </div>
        </div>
      </section>

      {/* Controls */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Tabs value={tab} onValueChange={handleTabChange}>
              <TabsList data-ocid="videos.filter.tab">
                <TabsTrigger value="all" data-ocid="videos.filter.tab.all">
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="shorts"
                  data-ocid="videos.filter.tab.shorts"
                >
                  Shorts
                </TabsTrigger>
                <TabsTrigger
                  value="longform"
                  data-ocid="videos.filter.tab.longform"
                >
                  Long-form
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search videos..."
                  aria-label="Search videos"
                  data-ocid="videos.search_input"
                  className="w-full pl-9 sm:w-64"
                />
              </form>
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger
                  className="w-full sm:w-48"
                  aria-label="Filter by category"
                  data-ocid="videos.category_select"
                >
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent data-ocid="videos.category_dropdown_menu">
                  {CATEGORIES.map((c) => (
                    <SelectItem
                      key={c}
                      value={c}
                      data-ocid={`videos.category_select.${c.toLowerCase()}`}
                    >
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-background">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
          {isLoading && (
            <LoadingState
              variant="grid"
              count={6}
              ocid="videos.loading_state"
            />
          )}

          {!isLoading && items.length === 0 && (
            <EmptyState
              icon={VideoIcon}
              title="No videos found"
              description="Try a different search term, category, or tab. New videos are uploaded by creators regularly."
              actionLabel="Upload a video"
              onAction={() => navigate({ to: "/videos/new" })}
              ocid="videos.empty_state"
            />
          )}

          {!isLoading && items.length > 0 && (
            <>
              {/* Shorts row — vertical cards */}
              {tab !== "longform" && shorts.length > 0 && (
                <div className="mb-10">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                      Shorts
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      {shorts.length} short{shorts.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div
                    className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
                    data-ocid="videos.shorts.list"
                  >
                    {shorts.map((v, i) => (
                      <ShortsCard
                        key={v.id.toString()}
                        item={toContentCardItem(v)}
                        index={i}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Long-form grid — horizontal cards */}
              {tab !== "shorts" && longform.length > 0 && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                      {tab === "longform" ? "Long-form videos" : "Long-form"}
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      {longform.length} video{longform.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div
                    className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                    data-ocid="videos.longform.list"
                  >
                    {longform.map((v, i) => (
                      <motion.div
                        key={v.id.toString()}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.05, 0.4) }}
                        data-ocid={`videos.longform.item.${i + 1}`}
                      >
                        <ContentCard item={toContentCardItem(v)} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* When "All" tab mixes both, also show a unified grid fallback */}
              {tab === "all" && shorts.length === 0 && longform.length > 0 && (
                <div
                  className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                  data-ocid="videos.list"
                >
                  {cardItems.map((item, i) => (
                    <motion.div
                      key={item.id.toString()}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.05, 0.4) }}
                      data-ocid={`videos.item.${i + 1}`}
                    >
                      <ContentCard item={item} />
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Pagination */}
          {!isLoading && total > Number(PAGE_SIZE) && (
            <div className="mt-10">
              <Pagination
                page={page}
                pageSize={Number(PAGE_SIZE)}
                total={total}
                onPageChange={setPage}
                ocid="videos.pagination"
              />
            </div>
          )}

          {/* Refetching indicator */}
          {isFetching && !isLoading && items.length > 0 && (
            <p
              className="mt-6 text-center text-xs text-muted-foreground"
              data-ocid="videos.refetching_state"
            >
              Updating…
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
