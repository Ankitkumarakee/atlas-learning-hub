import { ContentType } from "@/backend";
import { BookmarkButton } from "@/components/shared/BookmarkButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { LikeButton } from "@/components/shared/LikeButton";
import { LoadingState } from "@/components/shared/LoadingState";
import { RelatedContentSection } from "@/components/shared/RelatedContentSection";
import { VideoPlayer } from "@/components/shared/VideoPlayer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useBackend } from "@/hooks/useBackend";
import {
  useIncrementView,
  useRelatedContent,
  useVideo,
} from "@/hooks/useQueries";
import { recommendationsToCardItems } from "@/lib/recommendations";
import type { Video } from "@/types";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  Eye,
  Heart,
  Lock,
  PlayCircle,
  User,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCount(value: bigint | number): string {
  const n = typeof value === "bigint" ? Number(value) : value;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(ts: bigint): string {
  const ms = Number(ts);
  if (!ms) return "";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(seconds: bigint): string {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function authorInitials(principal: string): string {
  return principal.slice(0, 2).toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function VideoDetailPage() {
  const { id } = useParams({ strict: false }) as { id?: string };
  const videoId = id ? BigInt(id) : undefined;
  const navigate = useNavigate();
  const auth = useAuth();
  const { actor } = useBackend();
  const incrementView = useIncrementView();

  const { data: video, isLoading } = useVideo(videoId);
  const relatedQuery = useRelatedContent(ContentType.video, videoId, 4);
  const relatedItems = relatedQuery.data
    ? recommendationsToCardItems(relatedQuery.data)
    : [];
  const relatedLoading = relatedQuery.isLoading;

  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0n);
  const [viewCount, setViewCount] = useState(0n);
  const [viewCounted, setViewCounted] = useState(false);
  const [engagementPending, setEngagementPending] = useState(false);

  // Sync derived state when video loads.
  useEffect(() => {
    if (!video) return;
    setLikeCount(video.likeCount);
    setViewCount(video.viewCount);
  }, [video]);

  // Fetch like/bookmark status for signed-in users.
  useEffect(() => {
    if (!actor || !auth.isSignedIn || videoId === undefined) return;
    let cancelled = false;
    void (async () => {
      try {
        const [isLiked, isBookmarked] = await Promise.all([
          actor.isVideoLiked(videoId),
          actor.isVideoBookmarked(videoId),
        ]);
        if (!cancelled) {
          setLiked(isLiked);
          setBookmarked(isBookmarked);
        }
      } catch {
        // Status lookups are best-effort; ignore failures.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actor, auth.isSignedIn, videoId]);

  if (isLoading) {
    return (
      <div className="bg-background">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
          <LoadingState variant="card" count={1} ocid="video.loading_state" />
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="bg-background">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
          <EmptyState
            icon={PlayCircle}
            title="Video not found"
            description="This video may have been removed or is no longer available."
            actionLabel="Back to videos"
            onAction={() => navigate({ to: "/videos" })}
            ocid="video.not_found.empty_state"
          />
        </div>
      </div>
    );
  }

  const handleFirstPlay = () => {
    if (viewCounted || videoId === undefined) return;
    setViewCounted(true);
    const sessionKey = `view-${videoId.toString()}-${Date.now()}`;
    incrementView.mutate(
      { id: videoId, sessionKey },
      {
        onSuccess: () => setViewCount((c) => c + 1n),
        onError: () => setViewCounted(false), // allow retry on next play
      },
    );
  };

  const handleLikeToggle = () => {
    if (!auth.isSignedIn) {
      toast.info("Sign in to like videos");
      auth.signIn();
      return;
    }
    if (videoId === undefined || engagementPending) return;
    setEngagementPending(true);
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((c) => c + (nextLiked ? 1n : -1n));
    void (async () => {
      try {
        if (!actor) throw new Error("Actor not ready");
        if (nextLiked) await actor.likeVideo(videoId);
        else await actor.unlikeVideo(videoId);
      } catch (e) {
        // Revert optimistic update.
        setLiked(!nextLiked);
        setLikeCount((c) => c + (nextLiked ? -1n : 1n));
        toast.error(`Failed to update like: ${String(e)}`);
      } finally {
        setEngagementPending(false);
      }
    })();
  };

  const handleBookmarkToggle = () => {
    if (!auth.isSignedIn) {
      toast.info("Sign in to bookmark videos");
      auth.signIn();
      return;
    }
    if (videoId === undefined || engagementPending) return;
    setEngagementPending(true);
    const nextBookmarked = !bookmarked;
    setBookmarked(nextBookmarked);
    void (async () => {
      try {
        if (!actor) throw new Error("Actor not ready");
        if (nextBookmarked) await actor.bookmarkVideo(videoId);
        else await actor.unbookmarkVideo(videoId);
        toast.success(nextBookmarked ? "Bookmarked" : "Bookmark removed");
      } catch (e) {
        setBookmarked(!nextBookmarked);
        toast.error(`Failed to update bookmark: ${String(e)}`);
      } finally {
        setEngagementPending(false);
      }
    })();
  };

  const authorPrincipal = video.author.toText();
  const durationLabel = formatDuration(video.durationSeconds);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Back link */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/videos" })}
          className="mb-4"
          data-ocid="video.back_button"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All videos
        </Button>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          {/* Main column */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <VideoPlayer
                src={video.videoBlobId}
                poster={video.thumbnailBlobId || undefined}
                title={video.title}
                onFirstPlay={handleFirstPlay}
                ocid="video.player"
              />
            </motion.div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" data-ocid="video.category_badge">
                  {video.category}
                </Badge>
                {video.isShort && (
                  <Badge
                    className="bg-accent text-accent-foreground"
                    data-ocid="video.short_badge"
                  >
                    Short
                  </Badge>
                )}
                {durationLabel && (
                  <Badge variant="outline" data-ocid="video.duration_badge">
                    {durationLabel}
                  </Badge>
                )}
              </div>

              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {video.title}
              </h1>

              {/* Engagement bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span
                    className="flex items-center gap-1.5"
                    title="Views"
                    data-ocid="video.view_count"
                  >
                    <Eye className="size-4" aria-hidden />
                    {formatCount(viewCount)} views
                  </span>
                  <Separator orientation="vertical" className="h-4" />
                  <span
                    className="flex items-center gap-1.5"
                    title="Likes"
                    data-ocid="video.like_count"
                  >
                    <Heart className="size-4" aria-hidden />
                    {formatCount(likeCount)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <LikeButton
                    liked={liked}
                    count={likeCount}
                    onToggle={handleLikeToggle}
                    disabled={engagementPending}
                    ocid="video.like_button"
                  />
                  <BookmarkButton
                    bookmarked={bookmarked}
                    onToggle={handleBookmarkToggle}
                    disabled={engagementPending}
                    label={bookmarked ? "Saved" : "Save"}
                    ocid="video.bookmark_button"
                  />
                </div>
              </div>

              {/* Sign-in hint for guests */}
              {!auth.isSignedIn && (
                <p
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  data-ocid="video.signin_hint"
                >
                  <Lock className="size-3.5" aria-hidden />
                  Sign in to like and bookmark this video.
                </p>
              )}

              <Separator />

              {/* Description */}
              <div className="space-y-2">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Description
                </h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {video.description || "No description provided."}
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar — author info */}
          <aside className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-border bg-card p-5"
              data-ocid="video.author_card"
            >
              <h3 className="mb-3 font-display text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Creator
              </h3>
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                    {authorInitials(authorPrincipal)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium text-foreground">
                    @{authorPrincipal.slice(0, 8)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {authorPrincipal.slice(0, 16)}…
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full"
                onClick={() =>
                  navigate({
                    to: "/profile/$id",
                    params: { id: authorPrincipal },
                  })
                }
                data-ocid="video.view_creator_button"
              >
                <User className="size-4" aria-hidden />
                View creator
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-xl border border-border bg-muted/30 p-5"
              data-ocid="video.details_card"
            >
              <h3 className="mb-3 font-display text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Details
              </h3>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="size-3.5" aria-hidden />
                    Published
                  </dt>
                  <dd className="text-right font-medium text-foreground">
                    {formatDate(video.createdAt)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Eye className="size-3.5" aria-hidden />
                    Views
                  </dt>
                  <dd
                    className="text-right font-medium text-foreground tabular-nums"
                    data-ocid="video.sidebar.view_count"
                  >
                    {formatCount(viewCount)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Heart className="size-3.5" aria-hidden />
                    Likes
                  </dt>
                  <dd
                    className="text-right font-medium text-foreground tabular-nums"
                    data-ocid="video.sidebar.like_count"
                  >
                    {formatCount(likeCount)}
                  </dd>
                </div>
                {durationLabel && (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Duration</dt>
                    <dd className="text-right font-medium text-foreground tabular-nums">
                      {durationLabel}
                    </dd>
                  </div>
                )}
              </dl>
            </motion.div>
          </aside>
        </div>

        {/* Related content zone */}
        {relatedLoading ? (
          <section
            aria-label="Related content"
            className="mt-8 border-t border-border bg-background pt-8"
          >
            <h2 className="font-display text-xl font-semibold text-foreground">
              Related content
            </h2>
            <div className="mt-6">
              <LoadingState
                variant="grid"
                count={4}
                ocid="video.related.loading_state"
              />
            </div>
          </section>
        ) : relatedItems.length > 0 ? (
          <section
            aria-label="Related content"
            className="mt-8 border-t border-border bg-background pt-8"
          >
            <RelatedContentSection
              title="Related content"
              items={relatedItems}
              layout="grid"
              ocid="video.related"
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}
