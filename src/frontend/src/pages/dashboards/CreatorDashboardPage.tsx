import { ContentType } from "@/backend";
import { ChartContainer } from "@/components/shared/ChartContainer";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatCard } from "@/components/shared/StatCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  RecentCommentItem,
} from "@/types";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bookmark,
  Eye,
  FileText,
  Heart,
  LineChart as LineChartIcon,
  Lock,
  MessageSquare,
  Minus,
  PenLine,
  TrendingUp,
  Upload,
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
  [ContentType.blog]: "Blog",
  [ContentType.note]: "Note",
  [ContentType.video]: "Video",
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

type SortKey = "views" | "likes" | "comments" | "recent";

function formatNumber(n: bigint): string {
  const num = Number(n);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts);
  if (!ms) return "";
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
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

/* ------------------------------------------------------------------ */
/* Quick-create buttons                                                */
/* ------------------------------------------------------------------ */

const quickCreateActions: Array<{
  to: string;
  label: string;
  icon: typeof PenLine;
  ocid: string;
}> = [
  {
    to: "/blogs/new",
    label: "New blog",
    icon: PenLine,
    ocid: "creator_dashboard.create_blog",
  },
  {
    to: "/notes/new",
    label: "New note",
    icon: Upload,
    ocid: "creator_dashboard.create_note",
  },
  {
    to: "/videos/new",
    label: "New video",
    icon: Video,
    ocid: "creator_dashboard.create_video",
  },
];

function QuickCreateButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      {quickCreateActions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.to}
            variant="secondary"
            size="sm"
            asChild
            data-ocid={action.ocid}
          >
            <Link to={action.to}>
              <Icon className="mr-1.5 size-4" aria-hidden />
              {action.label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
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
/* Views chart (multi-series area)                                     */
/* ------------------------------------------------------------------ */

function ViewsChart({ data }: { data: CreatorDashboardData["viewsOverTime"] }) {
  const chartData = useMemo(
    () =>
      data.map((p) => ({
        date: p.date,
        blogViews: Number(p.blogViews),
        noteViews: Number(p.noteViews),
        videoViews: Number(p.videoViews),
      })),
    [data],
  );

  if (chartData.length === 0) {
    return (
      <EmptyState
        icon={LineChartIcon}
        title="No views yet"
        description="Once readers discover your content, daily views will appear here."
        ocid="creator_dashboard.views_chart.empty_state"
      />
    );
  }

  return (
    <ChartContainer
      title="Views over time"
      description="Daily views across blogs, notes, and videos (last 30 days)"
      type="area"
      data={chartData}
      xKey="date"
      series={[
        { key: "blogViews", name: "Blog views" },
        { key: "noteViews", name: "Note views" },
        { key: "videoViews", name: "Video views" },
      ]}
      height={300}
      ocid="creator_dashboard.views_chart"
      footer={
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ background: "var(--chart-1)" }}
              aria-hidden
            />
            Blog views
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ background: "var(--chart-2)" }}
              aria-hidden
            />
            Note views
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ background: "var(--chart-3)" }}
              aria-hidden
            />
            Video views
          </span>
        </div>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Performance table                                                   */
/* ------------------------------------------------------------------ */

function TrendIndicator({ trend }: { trend: bigint }) {
  const value = Number(trend);
  const isUp = value > 0;
  const isDown = value < 0;
  const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  const tone = isUp
    ? "text-accent"
    : isDown
      ? "text-destructive"
      : "text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center gap-1 tabular-nums ${tone}`}
      aria-label={`Trend ${isUp ? "up" : isDown ? "down" : "flat"} ${Math.abs(value)}`}
    >
      <Icon className="size-3.5" aria-hidden />
      {formatNumber(trend)}
    </span>
  );
}

function PerformanceTable({
  items,
}: {
  items: ContentPerformanceItem[];
}) {
  const [sort, setSort] = useState<SortKey>("views");

  const sorted = useMemo(() => {
    const copy = [...items];
    if (sort === "views") copy.sort((a, b) => Number(b.views - a.views));
    if (sort === "likes") copy.sort((a, b) => Number(b.likes - a.likes));
    if (sort === "comments")
      copy.sort((a, b) => Number(b.comments - a.comments));
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
          {sortButton("likes", "Likes")}
          {sortButton("comments", "Comments")}
          {sortButton("recent", "Recent")}
        </div>
      </div>
      <Table aria-label="Content performance by views, likes, comments, and trend">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[36%]">Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Views</TableHead>
            <TableHead className="text-right">Likes</TableHead>
            <TableHead className="text-right">Comments</TableHead>
            <TableHead className="text-right">Trend</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
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
                    {formatNumber(item.likes)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(item.comments)}
                  </TableCell>
                  <TableCell className="text-right">
                    <TrendIndicator trend={item.trend} />
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
/* Recent comments feed                                                */
/* ------------------------------------------------------------------ */

function RecentCommentsFeed({ items }: { items: RecentCommentItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No comments yet"
        description="When readers comment on your content, the latest comments will appear here."
        ocid="creator_dashboard.comments.empty_state"
      />
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card">
      <div className="border-b px-4 py-3">
        <h3 className="font-display text-base font-semibold">
          Recent comments
        </h3>
        <p className="text-sm text-muted-foreground">
          Latest reader feedback across all your content
        </p>
      </div>
      <ul
        className="divide-y divide-border"
        data-ocid="creator_dashboard.comments.list"
      >
        {items.map((comment, i) => {
          const authorText = comment.author.toText();
          const href = contentTypeHref[comment.contentType](comment.contentId);
          return (
            <li
              key={`${comment.commentId}`}
              data-ocid={`creator_dashboard.comments.item.${i + 1}`}
              className="flex gap-3 px-4 py-4 transition-colors hover:bg-muted/30"
            >
              <Avatar className="size-9 shrink-0">
                <AvatarFallback className="bg-primary/10 text-xs text-primary">
                  {initials(authorText.slice(-4) || "U")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate text-sm font-medium text-foreground">
                    {authorText}
                  </span>
                  <span className="text-xs text-muted-foreground">on</span>
                  <Link
                    to={href}
                    className="truncate text-sm font-medium text-primary hover:underline"
                    data-ocid={`creator_dashboard.comments.link.${i + 1}`}
                  >
                    {comment.contentTitle}
                  </Link>
                  <Badge variant="outline" className="ml-auto shrink-0">
                    {contentTypeLabel[comment.contentType]}
                  </Badge>
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                  {comment.content}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatTimestamp(comment.createdAt)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function CreatorDashboardPage() {
  const { isCreator, isLoadingRole } = useAuth();
  const { data, isLoading, isError, error, refetch } = useCreatorDashboard();

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
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
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
        </div>
        <QuickCreateButtons />
      </header>

      {isLoading ? (
        <LoadingState
          variant="card"
          count={4}
          ocid="creator_dashboard.loading_state"
        />
      ) : isError || !data ? (
        <ErrorState
          icon={LineChartIcon}
          title="Couldn't load your dashboard"
          message={
            error instanceof Error
              ? error.message
              : "There was a problem fetching your analytics. Please try again in a moment."
          }
          retryLabel="Retry"
          onRetry={() => refetch()}
          ocid="creator_dashboard.error_state"
        />
      ) : (
        <div className="space-y-8">
          <StatCards totals={data.totals} />

          <ViewsChart data={data.viewsOverTime} />

          <PerformanceTable items={data.contentPerformance} />

          <RecentCommentsFeed items={data.recentComments} />
        </div>
      )}
    </div>
  );
}

export default CreatorDashboardPage;
