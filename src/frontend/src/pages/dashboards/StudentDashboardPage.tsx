import type { ContentType } from "@/backend";
import { ChartContainer } from "@/components/shared/ChartContainer";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatCard } from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useStudentDashboard } from "@/hooks/useQueries";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bookmark,
  Heart,
  MessageSquare,
  Sparkles,
} from "lucide-react";

const contentTypeRoute: Record<ContentType, string> = {
  blog: "/blogs",
  note: "/notes",
  video: "/videos",
};

const contentTypeLabel: Record<ContentType, string> = {
  blog: "Blog",
  note: "Note",
  video: "Video",
};

function formatDate(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDateTime(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function StudentDashboardPage() {
  const { data, isLoading, isError, error } = useStudentDashboard();

  if (isLoading) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <LoadingState variant="card" count={3} ocid="student.loading_state" />
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={Sparkles}
          title="Couldn't load your dashboard"
          description={
            error instanceof Error
              ? error.message
              : "Please try again in a moment."
          }
          ocid="student.error_state"
        />
      </section>
    );
  }

  const { totals, learningActivityOverTime, bookmarks, recentAIConversations } =
    data;

  const activityData: Array<Record<string, unknown>> =
    learningActivityOverTime.map((p) => ({
      date: p.date,
      count: Number(p.bookmarks + p.likes + p.aiSessions),
    }));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Student dashboard
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your bookmarks, learning activity, and recent AI tutor conversations.
        </p>
      </header>

      {/* Overview stat cards */}
      <section
        data-ocid="student.overview.section"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <StatCard
          icon={Bookmark}
          label="Bookmarks"
          value={Number(totals.bookmarksCount)}
          hint="Saved across blogs, notes, and videos"
          ocid="student.overview.card.bookmarks"
        />
        <StatCard
          icon={Heart}
          label="Liked content"
          value={Number(totals.likedContentCount)}
          hint="Posts you've shown love to"
          tone="accent"
          ocid="student.overview.card.likes"
        />
        <StatCard
          icon={MessageSquare}
          label="AI conversations"
          value={Number(totals.aiConversationsCount)}
          hint="Tutor chats you've started"
          tone="chart"
          ocid="student.overview.card.conversations"
        />
      </section>

      {/* Learning activity chart */}
      <section data-ocid="student.activity.section" className="mt-10">
        {activityData.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No activity yet"
            description="Bookmark, like, or watch content to see your learning activity here."
            ocid="student.activity.empty_state"
          />
        ) : (
          <ChartContainer
            title="Learning activity over time"
            type="area"
            data={activityData}
            xKey="date"
            series={[{ key: "count", name: "Activity" }]}
            height={260}
            ocid="student.activity.chart"
          />
        )}
      </section>

      {/* Bookmarks grid */}
      <section data-ocid="student.bookmarks.section" className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Your bookmarks
          </h2>
          <Badge variant="secondary">{bookmarks.length} saved</Badge>
        </div>
        {bookmarks.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="No bookmarks yet"
            description="Save blogs, notes, or videos to find them quickly here later."
            actionLabel="Browse content"
            onAction={() => {
              window.location.assign("/blogs");
            }}
            ocid="student.bookmarks.empty_state"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bookmarks.map((item, index) => {
              const base =
                contentTypeRoute[item.content.contentType] ?? "/blogs";
              const detailPath = `${base}/${item.content.id.toString()}`;
              return (
                <Card
                  key={`${item.content.id.toString()}-${index}`}
                  data-ocid={`student.bookmarks.item.${index + 1}`}
                  className="group transition-smooth hover:border-primary/40 hover:shadow-md"
                >
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">
                        {contentTypeLabel[item.content.contentType] ??
                          item.content.contentType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.bookmarkedAt)}
                      </span>
                    </div>
                    <h3 className="line-clamp-2 font-medium leading-snug">
                      {item.content.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      by {item.content.author.toText()}
                    </p>
                    <Button
                      data-ocid={`student.bookmarks.open_button.${index + 1}`}
                      variant="ghost"
                      size="sm"
                      className="mt-auto justify-start px-0 text-primary hover:bg-transparent hover:underline"
                      asChild
                    >
                      <Link to={detailPath}>
                        Open
                        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent AI conversations */}
      <section data-ocid="student.conversations.section" className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Recent AI tutor conversations
          </h2>
          <Button
            data-ocid="student.new_conversation_button"
            variant="secondary"
            size="sm"
            asChild
          >
            <Link to="/tutor">New chat</Link>
          </Button>
        </div>
        {recentAIConversations.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No conversations yet"
            description="Ask the AI tutor anything — your chats will appear here."
            actionLabel="Start a conversation"
            onAction={() => {
              window.location.assign("/tutor");
            }}
            ocid="student.conversations.empty_state"
          />
        ) : (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {recentAIConversations.map((conv, index) => (
                <Link
                  key={conv.id.toString()}
                  to="/tutor/$conversationId"
                  params={{ conversationId: conv.id.toString() }}
                  data-ocid={`student.conversations.item.${index + 1}`}
                  className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{conv.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Number(conv.messageCount)} messages ·{" "}
                      {formatDateTime(conv.lastMessageAt)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
