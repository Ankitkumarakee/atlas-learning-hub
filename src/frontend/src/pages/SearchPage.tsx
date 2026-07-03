import type { BlogView, NoteView, Video } from "@/backend";
import { ContentCard } from "@/components/shared/ContentCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBlogs, useNotes, useVideos } from "@/hooks/useQueries";
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
/* Filter chips                                                       */
/* ------------------------------------------------------------------ */

type Filter = "all" | ContentKind;

const FILTERS: { value: Filter; label: string; icon: typeof BookOpen }[] = [
  { value: "all", label: "All", icon: SearchIcon },
  { value: "blog", label: "Blogs", icon: BookOpen },
  { value: "note", label: "Notes", icon: FileText },
  { value: "video", label: "Videos", icon: PlayCircle },
];

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function SearchPage() {
  const { q } = useSearch({ strict: false }) as { q?: string };
  const navigate = useNavigate();
  const [input, setInput] = useState(q ?? "");
  const [filter, setFilter] = useState<Filter>("all");

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
  });
  const notes = useNotes({
    page: 0n,
    pageSize: 100n,
    search: hasQuery ? query : undefined,
  });
  const videos = useVideos({
    page: 0n,
    pageSize: 100n,
    search: hasQuery ? query : undefined,
  });

  const anyLoading =
    hasQuery && (blogs.isLoading || notes.isLoading || videos.isLoading);

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
    navigate({ to: "/search", search: trimmed ? { q: trimmed } : {} });
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
        {/* Filter chips */}
        <div
          className="mb-6 flex flex-wrap gap-2"
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
                onClick={() => setFilter(f.value)}
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

        {!hasQuery ? (
          <EmptyState
            icon={SearchIcon}
            title="Start your search"
            description="Enter a query above to find blogs, notes, and videos."
            ocid="search.empty_state"
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
