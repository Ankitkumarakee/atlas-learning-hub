import { ContentType } from "@/backend";
import { ChartContainer } from "@/components/shared/ChartContainer";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatCard } from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useCreatorDashboard } from "@/hooks/useQueries";
import type {
  ContentPerformanceItem,
  CreatorDashboard as CreatorDashboardData,
} from "@/types";
import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Bookmark,
  Eye,
  FileText,
  Heart,
  LineChart as LineChartIcon,
  Lock,
  TrendingUp,
  Video,
} from "lucide-react";
import { useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/* Access gate                                                         */
/* ------------------------------------------------------------------ */

function AccessDenied() {
  const { signIn } = useAuth();
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
      <EmptyState
        icon={Lock}
        title="Creator access required"
        description="Sign in with an Internet Identity to view your creator analytics, engagement, and content performance."
        actionLabel="Sign in"
        onAction={signIn}
        ocid="creator_dashboard.access_denied"
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const contentTypeLabel: Record<ContentType, string> = {
  [ContentType.blog]: "Blogs",
  [ContentType.note]: "Notes",
  [ContentType.video]: "Videos",
};

const contentTypeIcon: Record<ContentType, typeof FileText> = {
  [ContentType.blog]: FileText,
  [ContentType.note]: FileText,
  [ContentType.video]: Video,
};

const contentTypeHref: Record<ContentType, (id: bigint) => string> = {
  [ContentType.blog]: (id) => `/blogs/${id}`,
  [ContentType.note]: (id) => `/notes/${id}`,
  [ContentType.video]: (id) => `/videos/${id}`,
};

type SortKey = "views" | "likes" | "recent";

function formatNumber(n: bigint): string {
  const num = Number(n);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

/* ------------------------------------------------------------------ */
/* Stat cards                                                          */
/* ------------------------------------------------------------------ */

function StatCards({ totals }: { totals: CreatorDashboardData["totals"] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total views"
        value={formatNumber(totals.totalViews)}
        icon={Eye}
        tone="primary"
        hint="All-time across your content"
        ocid="creator_dashboard.stat.total_views"
      />
      <StatCard
        label="Total likes"
        value={formatNumber(totals.totalLikes)}
        icon={Heart}
        tone="accent"
        hint="Reader appreciation"
        ocid="creator_dashboard.stat.total_likes"
      />
      <StatCard
        label="Total bookmarks"
        value={formatNumber(totals.totalBookmarks)}
        icon={Bookmark}
        tone="chart"
        hint="Saved by students"
        ocid="creator_dashboard.stat.total_bookmarks"
      />
      <StatCard
        label="Content count"
        value={formatNumber(totals.contentCount)}
        icon={FileText}
        tone="primary"
        hint="Published items"
        ocid="creator_dashboard.stat.content_count"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

function ViewsChart({ data }: { data: CreatorDashboardData["viewsOverTime"] }) {
  const chartData = useMemo(
    () =>
      data.map((p) => ({
        date: p.date,
        views: Number(p.count),
      })),
    [data],
  );
  return (
    <ChartContainer
      title="Views over time"
      description="Daily views across all your content (last 30 days)"
      type="line"
      data={chartData}
      xKey="date"
      series={[{ key: "views", name: "Views" }]}
      height={280}
      ocid="creator_dashboard.views_chart"
    />
  );
}

function EngagementChart({
  data,
}: {
  data: CreatorDashboardData["engagementByType"];
}) {
  const chartData = useMemo(
    () =>
      data.map((e) => ({
        type: contentTypeLabel[e.contentType],
        likes: Number(e.likes),
        comments: Number(e.comments),
        bookmarks: Number(e.bookmarks),
      })),
    [data],
  );
  return (
    <ChartContainer
      title="Engagement by content type"
      description="Likes, comments, and bookmarks broken down by content kind"
      type="bar"
      data={chartData}
      xKey="type"
      series={[
        { key: "likes", name: "Likes" },
        { key: "comments", name: "Comments" },
        { key: "bookmarks", name: "Bookmarks" },
      ]}
      height={280}
      ocid="creator_dashboard.engagement_chart"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Performance table                                                   */
/* ------------------------------------------------------------------ */

function PerformanceTable({
  items,
}: {
  items: ContentPerformanceItem[];
}) {
  const [sort, setSort] = useState<SortKey>("views");

  const sorted = useMemo(() => {
    const copy = [...items];
    if (sort === "views") copy.sort((a, b) => Number(b.views - a.views));
    if (sort === "likes") copy.sort((a, b) => Number(b.trend - a.trend));
    if (sort === "recent") copy.sort((a, b) => Number(b.id - a.id));
    return copy;
  }, [items, sort]);

  const sortButton = (key: SortKey, label: string) => (
    <Button
      variant={sort === key ? "secondary" : "ghost"}
      size="sm"
      className="h-7 px-2 text-xs"
      onClick={() => setSort(key)}
      data-ocid={`creator_dashboard.table.sort_${key}`}
    >
      {label}
    </Button>
  );

  return (
    <div className="rounded-xl border border-border/60 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <h3 className="font-display text-base font-semibold">
            Content performance
          </h3>
          <p className="text-sm text-muted-foreground">
            Sortable breakdown of your published content
          </p>
        </div>
        <div
          className="flex items-center gap-1"
          data-ocid="creator_dashboard.table.sort_group"
        >
          {sortButton("views", "Views")}
          {sortButton("likes", "Trend")}
          {sortButton("recent", "Recent")}
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Views</TableHead>
            <TableHead className="text-right">Trend</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="py-8 text-center text-muted-foreground"
              >
                No published content yet.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((item, i) => {
              const Icon = contentTypeIcon[item.contentType];
              return (
                <TableRow
                  key={`${item.contentType}-${item.id}`}
                  data-ocid={`creator_dashboard.table.row.${i + 1}`}
                >
                  <TableCell className="max-w-0">
                    <Link
                      to={contentTypeHref[item.contentType](item.id)}
                      className="flex items-center gap-2 truncate font-medium text-foreground hover:text-primary"
                      data-ocid={`creator_dashboard.table.link.${i + 1}`}
                    >
                      <Icon
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {contentTypeLabel[item.contentType]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(item.views)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp
                        className="size-3.5 text-accent"
                        aria-hidden
                      />
                      {formatNumber(item.trend)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Top content list                                                    */
/* ------------------------------------------------------------------ */

function TopContent({ items }: { items: ContentPerformanceItem[] }) {
  const top = useMemo(
    () => [...items].sort((a, b) => Number(b.views - a.views)).slice(0, 5),
    [items],
  );
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className="size-4 text-primary" aria-hidden />
        <h3 className="font-display text-base font-semibold">Top content</h3>
      </div>
      {top.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No content to rank yet.
        </p>
      ) : (
        <ol className="space-y-2">
          {top.map((item, i) => {
            const Icon = contentTypeIcon[item.contentType];
            return (
              <li
                key={`${item.contentType}-${item.id}`}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
                data-ocid={`creator_dashboard.top.item.${i + 1}`}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <Icon
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <Link
                  to={contentTypeHref[item.contentType](item.id)}
                  className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary"
                  data-ocid={`creator_dashboard.top.link.${i + 1}`}
                >
                  {item.title}
                </Link>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {formatNumber(item.views)} views
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function CreatorDashboardPage() {
  const { isCreator, isLoadingRole } = useAuth();
  const { data, isLoading, isError } = useCreatorDashboard();

  if (isLoadingRole) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <LoadingState
          variant="card"
          count={4}
          ocid="creator_dashboard.loading_state"
        />
      </section>
    );
  }

  if (!isCreator) return <AccessDenied />;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <LineChartIcon className="size-6" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Creator dashboard
          </h1>
          <p className="text-muted-foreground">
            Your content performance and engagement at a glance.
          </p>
        </div>
      </header>

      {isLoading ? (
        <LoadingState
          variant="card"
          count={4}
          ocid="creator_dashboard.loading_state"
        />
      ) : isError || !data ? (
        <EmptyState
          icon={LineChartIcon}
          title="Couldn't load your dashboard"
          description="There was a problem fetching your analytics. Please try again in a moment."
          ocid="creator_dashboard.error_state"
        />
      ) : (
        <div className="space-y-8">
          <StatCards totals={data.totals} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ViewsChart data={data.viewsOverTime} />
            <EngagementChart data={data.engagementByType} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <PerformanceTable items={data.contentPerformance} />
            </div>
            <TopContent items={data.contentPerformance} />
          </div>
        </div>
      )}
    </div>
  );
}

export default CreatorDashboardPage;
