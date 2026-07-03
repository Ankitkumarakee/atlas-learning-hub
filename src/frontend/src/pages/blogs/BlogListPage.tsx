import { BlogSort } from "@/backend";
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
import { useBlogs } from "@/hooks/useQueries";
import type { ContentCardItem } from "@/types";
import { useNavigate } from "@tanstack/react-router";
import { FileX, Plus, Search, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function BlogListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState<BlogSort>(BlogSort.newest);
  const [page, setPage] = useState(0n);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0n);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset page on filter change
  useEffect(() => {
    setPage(0n);
  }, [tag, sort]);

  const query = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      tag: tag.trim() || undefined,
      sort,
      page,
      pageSize: 12n,
    }),
    [debouncedSearch, tag, sort, page],
  );

  const blogsQuery = useBlogs(query);
  const items = blogsQuery.data?.items ?? [];
  const total = blogsQuery.data?.total ?? 0n;
  const isLoading = blogsQuery.isLoading;
  const isFetching = blogsQuery.isFetching;

  const cards: ContentCardItem[] = useMemo(
    () =>
      items.map((b) => ({
        id: b.id,
        kind: "blog" as const,
        title: b.title,
        excerpt: b.excerpt,
        author: b.author.toText().slice(0, 8),
        createdAt: b.createdAt,
        likeCount: b.likeCount,
        tags: b.tags,
      })),
    [items],
  );

  const showLoading = isLoading || (isFetching && items.length === 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header zone */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Blog
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Essays, tutorials, and notes from creators across the platform.
                Read, react, and join the conversation.
              </p>
            </div>
            <Button
              data-ocid="blog.new_button"
              onClick={() => navigate({ to: "/blogs/new" })}
              className="self-start sm:self-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Write a blog
            </Button>
          </div>
        </div>
      </section>

      {/* Content zone */}
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Filter bar */}
          <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                data-ocid="blog.search_input"
                type="text"
                placeholder="Search blogs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                aria-label="Search blogs"
              />
            </div>

            <div className="relative">
              <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                data-ocid="blog.tag_input"
                type="text"
                placeholder="Filter by tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="pl-9"
                aria-label="Filter by tag"
              />
            </div>

            <Select value={sort} onValueChange={(v) => setSort(v as BlogSort)}>
              <SelectTrigger
                data-ocid="blog.sort_select"
                aria-label="Sort blogs"
                className="w-full"
              >
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BlogSort.newest}>Newest</SelectItem>
                <SelectItem value={BlogSort.mostLiked}>Most liked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results */}
          {showLoading ? (
            <LoadingState variant="grid" />
          ) : cards.length === 0 ? (
            <EmptyState
              icon={FileX}
              title="No blogs found"
              description="Try adjusting your search or filters, or be the first to write a blog."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((item, idx) => (
                  <div
                    key={item.id}
                    data-ocid={`blog.item.${idx + 1}`}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate({
                        to: "/blogs/$id",
                        params: { id: String(item.id) },
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        navigate({
                          to: "/blogs/$id",
                          params: { id: String(item.id) },
                        });
                    }}
                  >
                    <ContentCard item={item} />
                  </div>
                ))}
              </div>

              <div className="mt-10 flex justify-center">
                <Pagination
                  page={Number(page)}
                  pageSize={12}
                  total={Number(total)}
                  onPageChange={(p) => setPage(BigInt(p))}
                />
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
