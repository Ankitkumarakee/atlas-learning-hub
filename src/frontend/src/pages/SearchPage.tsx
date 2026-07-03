import type { BlogView, NoteView, Video } from "@/backend";
import { ContentCard } from "@/components/shared/ContentCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BlogSort,
  NoteSort,
  VideoSort,
  useBlogs,
  useNotes,
  useVideos,
} from "@/hooks/useQueries";
import type { ContentCardItem, ContentKind } from "@/types";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  BookOpen,
  FileText,
  PlayCircle,
  Search as SearchIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/* Mappers                                                            */
/* ------------------------------------------------------------------ */

function blogToCard(b: BlogView): ContentCardItem {
  return {
    id: b.id,
    kind: "blog",
    title: b.title,
    excerpt: b.excerpt,
    author: b.author.toText().slice(0, 8),
    createdAt: b.createdAt,
    likeCount: b.likeCount,
    viewCount: b.viewCount,
    tags: b.tags,
  };
}

function noteToCard(n: NoteView): ContentCardItem {
  return {
    id: n.id,
    kind: "note",
    title: n.title,
    excerpt: n.description,
    author: n.author.toText().slice(0, 8),
    createdAt: n.createdAt,
    likeCount: n.likeCount,
    downloadCount: n.downloadCount,
    fileType: n.fileType,
    subject: n.subject,
  };
}

function videoToCard(v: Video): ContentCardItem {
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
  };
}

/* ------------------------------------------------------------------ */
/* Filter + sort config                                               */
/* ------------------------------------------------------------------ */

type Filter = "all" | ContentKind;

const FILTERS: { value: Filter; label: string; icon: typeof BookOpen }[] = [
  { value: "all", label: "All", icon: SearchIcon },
  { value: "blog", label: "Blogs", icon: BookOpen },
  { value: "note", label: "Notes", icon: FileText },
  { value: "video", label: "Videos", icon: PlayCircle },
];

/** Unified sort options surfaced in the UI. */
type SortKey = "newest" | "mostViewed" | "mostLiked" | "mostBookmarked";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "mostViewed", label: "Most viewed" },
  { value: "mostLiked", label: "Most liked" },
  { value: "mostBookmarked", label: "Most bookmarked" },
];

const DEFAULT_SORT: SortKey = "newest";
const DEFAULT_FILTER: Filter = "all";

/**
 * Map the unified sort key to each content type's backend enum.
 * Notes have no "mostViewed" — fall back to "mostDownloaded" (the closest
 * engagement signal for downloadable notes).
 */
function blogSortFor(key: SortKey): BlogSort {
  switch (key) {
    case "mostViewed":
      return BlogSort.mostViewed;
    case "mostLiked":
      return BlogSort.mostLiked;
    case "mostBookmarked":
      return BlogSort.mostBookmarked;
    default:
      return BlogSort.newest;
  }
}

function noteSortFor(key: SortKey): NoteSort {
  switch (key) {
    case "mostViewed":
      return NoteSort.mostDownloaded;
    case "mostLiked":
      return NoteSort.mostLiked;
    case "mostBookmarked":
      return NoteSort.mostBookmarked;
    default:
      return NoteSort.newest;
  }
}

function videoSortFor(key: SortKey): VideoSort {
  switch (key) {
    case "mostViewed":
      return VideoSort.mostViewed;
    case "mostLiked":
      return VideoSort.mostLiked;
    case "mostBookmarked":
      return VideoSort.mostBookmarked;
    default:
      return VideoSort.newest;
  }
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function SearchPage() {
  const { q, type, sort } = useSearch({ strict: false }) as {
    q?: string;
    type?: Filter;
    sort?: SortKey;
  };
  const navigate = useNavigate();
  const [input, setInput] = useState(q ?? "");

  const filter: Filter = type ?? DEFAULT_FILTER;
  const sortKey: SortKey = sort ?? DEFAULT_SORT;

  // Keep input in sync if URL changes (e.g. back/forward).
  useEffect(() => {
    setInput(q ?? "");
  }, [q]);

  const query = (q ?? "").trim();
  const hasQuery = query.length > 0;

  const blogs = useBlogs({
    page: 0n,
    pageSize: 100n,
    search: hasQuery ? query : undefined,
    sort: blogSortFor(sortKey),
  });
  const notes = useNotes({
    page: 0n,
    pageSize: 100n,
    search: hasQuery ? query : undefined,
    sort: noteSortFor(sortKey),
  });
  const videos = useVideos({
    page: 0n,
    pageSize: 100n,
    search: hasQuery ? query : undefined,
    sort: videoSortFor(sortKey),
  });

  const anyLoading =
    hasQuery && (blogs.isLoading || notes.isLoading || videos.isLoading);
  const anyError = blogs.isError || notes.isError || videos.isError;

  const results = useMemo<ContentCardItem[]>(() => {
    if (!hasQuery) return [];
    const blogCards = (blogs.data?.items ?? []).map(blogToCard);
    const noteCards = (notes.data?.items ?? []).map(noteToCard);
    const videoCards = (videos.data?.items ?? []).map(videoToCard);
    const all = [...blogCards, ...noteCards, ...videoCards];
    if (filter === "all") return all;
    return all.filter((item) => item.kind === filter);
  }, [hasQuery, blogs.data, notes.data, videos.data, filter]);

  const counts = useMemo(() => {
    const blogCount = (blogs.data?.items ?? []).length;
    const noteCount = (notes.data?.items ?? []).length;
    const videoCount = (videos.data?.items ?? []).length;
    return {
      all: blogCount + noteCount + videoCount,
      blog: blogCount,
      note: noteCount,
      video: videoCount,
    };
  }, [blogs.data, notes.data, videos.data]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    navigate({
      to: "/search",
      search: trimmed ? { q: trimmed, type: filter, sort: sortKey } : {},
    });
  }

  function updateFilter(next: Filter) {
    navigate({
      to: "/search",
      search: (prev) => ({
        q: prev?.q,
        type: next === DEFAULT_FILTER ? undefined : next,
        sort: sortKey === DEFAULT_SORT ? undefined : sortKey,
      }),
    });
  }

  function updateSort(next: SortKey) {
    navigate({
      to: "/search",
      search: (prev) => ({
        q: prev?.q,
        type: filter === DEFAULT_FILTER ? undefined : filter,
        sort: next === DEFAULT_SORT ? undefined : next,
      }),
    });
  }

  function retry() {
    void blogs.refetch();
    void notes.refetch();
    void videos.refetch();
  }

  return (
    <div className="bg-background">
      {/* Search header */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Search
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Find blogs, notes, and videos across the platform.
          </p>
          <form onSubmit={handleSubmit} className="mt-5 flex gap-2">
            <div className="relative flex-1">
              <SearchIcon
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search by title, tag, or keyword..."
                className="pl-9"
                aria-label="Search query"
                data-ocid="search.input"
              />
            </div>
            <Button type="submit" data-ocid="search.submit_button">
              Search
            </Button>
          </form>
        </div>
      </section>

      {/* Results */}
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        {/* Filter chips + sort control */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Filter by content type"
          >
            {FILTERS.map((f) => {
              const count = f.value === "all" ? counts.all : counts[f.value];
              const active = filter === f.value;
              const Icon = f.icon;
              return (
                <Button
                  key={f.value}
                  type="button"
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter(f.value)}
                  aria-pressed={active}
                  role="tab"
                  data-ocid={`search.filter.${f.value}`}
                >
                  <Icon className="mr-1.5 size-3.5" aria-hidden />
                  {f.label}
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({count})
                  </span>
                </Button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="search-sort"
              className="text-sm text-muted-foreground"
            >
              Sort
            </label>
            <Select
              value={sortKey}
              onValueChange={(v) => updateSort(v as SortKey)}
            >
              <SelectTrigger
                id="search-sort"
                data-ocid="search.sort_select"
                aria-label="Sort results"
                className="w-[180px]"
              >
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    data-ocid={`search.sort_option.${opt.value}`}
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!hasQuery ? (
          <EmptyState
            icon={SearchIcon}
            title="Start your search"
            description="Enter a query above to find blogs, notes, and videos."
            ocid="search.empty_state"
          />
        ) : anyError ? (
          <ErrorState
            title="Search failed"
            message="We couldn't load search results. Please try again."
            retryLabel="Retry"
            onRetry={retry}
            ocid="search.error_state"
          />
        ) : anyLoading ? (
          <LoadingState variant="grid" count={6} ocid="search.loading_state" />
        ) : results.length === 0 ? (
          <EmptyState
            icon={SearchIcon}
            title={`No results for "${query}"`}
            description="Try a different keyword or broaden your filters."
            ocid="search.no_results.empty_state"
          />
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {results.length} {results.length === 1 ? "result" : "results"} for{" "}
              <span className="font-medium text-foreground">"{query}"</span>
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((item, i) => (
                <motion.div
                  key={`${item.kind}-${item.id.toString()}`}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{
                    duration: 0.3,
                    delay: (i % 3) * 0.06,
                    ease: "easeOut",
                  }}
                >
                  <ContentCard item={item} />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
