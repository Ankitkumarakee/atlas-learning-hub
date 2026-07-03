import type { BlogView, NoteView, Video } from "@/backend";
import { ContentCard } from "@/components/shared/ContentCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useBlogs, useNotes, useVideos } from "@/hooks/useQueries";
import type { ContentCardItem } from "@/types";
import { Link, useParams } from "@tanstack/react-router";
import {
  BookOpen,
  FileText,
  LogOut,
  PlayCircle,
  User as UserIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

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
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProfilePage() {
  const { id } = useParams({ strict: false });
  const auth = useAuth();

  // Determine whose profile we're viewing.
  const profileId = (id as string | undefined) ?? auth.principal ?? undefined;
  const isOwnProfile =
    !id || (auth.principal !== null && id === auth.principal);

  // Fetch all content (large page) and filter client-side by author.
  const blogs = useBlogs({ page: 0n, pageSize: 100n });
  const notes = useNotes({ page: 0n, pageSize: 100n });
  const videos = useVideos({ page: 0n, pageSize: 100n });

  const anyLoading = blogs.isLoading || notes.isLoading || videos.isLoading;

  const authored = useMemo(() => {
    if (!profileId) return { blogs: [], notes: [], videos: [] };
    const blogCards = (blogs.data?.items ?? [])
      .filter((b) => b.author.toText() === profileId)
      .map(blogToCard);
    const noteCards = (notes.data?.items ?? [])
      .filter((n) => n.author.toText() === profileId)
      .map(noteToCard);
    const videoCards = (videos.data?.items ?? [])
      .filter((v) => v.author.toText() === profileId)
      .map(videoToCard);
    return { blogs: blogCards, notes: noteCards, videos: videoCards };
  }, [profileId, blogs.data, notes.data, videos.data]);

  const displayName = isOwnProfile
    ? (auth.principal?.slice(0, 8) ?? "Guest")
    : (profileId?.slice(0, 8) ?? "Unknown");
  const initials = displayName.slice(0, 2).toUpperCase();
  const totalCount =
    authored.blogs.length + authored.notes.length + authored.videos.length;

  return (
    <div className="bg-background">
      {/* Profile header */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col items-start gap-6 sm:flex-row sm:items-center"
          >
            <Avatar className="size-20 border border-border">
              <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
                  {displayName}
                </h1>
                <RoleBadge role={isOwnProfile ? auth.displayRole : "creator"} />
              </div>
              <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                {profileId ?? "Not signed in"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {totalCount} {totalCount === 1 ? "item" : "items"} published
              </p>
            </div>
            {isOwnProfile && auth.isSignedIn && (
              <Button
                variant="outline"
                onClick={() => auth.signOut()}
                data-ocid="profile.signout_button"
              >
                <LogOut className="mr-2 size-4" aria-hidden />
                Sign out
              </Button>
            )}
          </motion.div>
        </div>
      </section>

      {/* Authored content */}
      <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        {anyLoading ? (
          <LoadingState
            variant="grid"
            count={6}
            ocid="profile.content.loading_state"
          />
        ) : totalCount === 0 ? (
          <EmptyState
            icon={UserIcon}
            title={
              isOwnProfile
                ? "You haven't published anything yet"
                : "No published content"
            }
            description={
              isOwnProfile
                ? "Share your knowledge — write a blog, upload notes, or publish a video."
                : "This creator hasn't published any content yet."
            }
            actionLabel={isOwnProfile ? "Browse content" : undefined}
            onAction={
              isOwnProfile
                ? () => {
                    window.location.href = "/";
                  }
                : undefined
            }
            ocid="profile.content.empty_state"
          />
        ) : (
          <Tabs defaultValue="blogs" className="w-full">
            <TabsList className="mb-6" data-ocid="profile.content.tabs">
              <TabsTrigger value="blogs" data-ocid="profile.content.tab.blogs">
                <BookOpen className="mr-1.5 size-3.5" aria-hidden />
                Blogs ({authored.blogs.length})
              </TabsTrigger>
              <TabsTrigger value="notes" data-ocid="profile.content.tab.notes">
                <FileText className="mr-1.5 size-3.5" aria-hidden />
                Notes ({authored.notes.length})
              </TabsTrigger>
              <TabsTrigger
                value="videos"
                data-ocid="profile.content.tab.videos"
              >
                <PlayCircle className="mr-1.5 size-3.5" aria-hidden />
                Videos ({authored.videos.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="blogs">
              {authored.blogs.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="No blogs published"
                  ocid="profile.blogs.empty_state"
                />
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {authored.blogs.map((item, i) => (
                    <motion.div
                      key={`blog-${item.id.toString()}`}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: (i % 3) * 0.06 }}
                    >
                      <ContentCard item={item} />
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes">
              {authored.notes.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No notes published"
                  ocid="profile.notes.empty_state"
                />
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {authored.notes.map((item, i) => (
                    <motion.div
                      key={`note-${item.id.toString()}`}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: (i % 3) * 0.06 }}
                    >
                      <ContentCard item={item} />
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="videos">
              {authored.videos.length === 0 ? (
                <EmptyState
                  icon={PlayCircle}
                  title="No videos published"
                  ocid="profile.videos.empty_state"
                />
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {authored.videos.map((item, i) => (
                    <motion.div
                      key={`video-${item.id.toString()}`}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: (i % 3) * 0.06 }}
                    >
                      <ContentCard item={item} />
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </section>
    </div>
  );
}
