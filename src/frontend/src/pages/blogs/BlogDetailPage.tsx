import { BookmarkButton } from "@/components/shared/BookmarkButton";
import { CommentThread } from "@/components/shared/CommentThread";
import { EmptyState } from "@/components/shared/EmptyState";
import { LikeButton } from "@/components/shared/LikeButton";
import { LoadingState } from "@/components/shared/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  useAddComment,
  useBlog,
  useBookmarkBlog,
  useComments,
  useDeleteComment,
  useLikeBlog,
  useUnbookmarkBlog,
  useUnlikeBlog,
} from "@/hooks/useQueries";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Eye, FileX } from "lucide-react";
import { useState } from "react";

export default function BlogDetailPage() {
  const { id } = useParams({ strict: false }) as { id?: string };
  const blogId = BigInt(id!);
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();

  const blogQuery = useBlog(blogId);
  const blog = blogQuery.data;
  const isLoading = blogQuery.isLoading;
  const commentsQuery = useComments(blogId);
  const comments = commentsQuery.data ?? [];
  const commentsLoading = commentsQuery.isLoading;

  const likeMut = useLikeBlog();
  const unlikeMut = useUnlikeBlog();
  const bookmarkMut = useBookmarkBlog();
  const unbookmarkMut = useUnbookmarkBlog();
  const addCommentMut = useAddComment();
  const deleteCommentMut = useDeleteComment();

  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <LoadingState variant="text" />
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <EmptyState
            icon={FileX}
            title="Blog not found"
            description="This blog may have been removed or never existed."
          />
          <div className="mt-6 flex justify-center">
            <Button
              data-ocid="blog.back_button"
              variant="secondary"
              onClick={() => navigate({ to: "/blogs" })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to blogs
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleLike = async () => {
    if (liked) {
      await unlikeMut.mutateAsync(blogId);
      setLiked(false);
    } else {
      await likeMut.mutateAsync(blogId);
      setLiked(true);
    }
  };

  const handleBookmark = async () => {
    if (bookmarked) {
      await unbookmarkMut.mutateAsync(blogId);
      setBookmarked(false);
    } else {
      await bookmarkMut.mutateAsync(blogId);
      setBookmarked(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header zone */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
          <Button
            data-ocid="blog.back_button"
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/blogs" })}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            All blogs
          </Button>

          {blog.tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {blog.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
          )}

          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {blog.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="font-mono">
              {blog.author.toText().slice(0, 8)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {Number(blog.viewCount)} views
            </span>
            <span>{Number(blog.likeCount)} likes</span>
          </div>
        </div>
      </header>

      {/* Content zone */}
      <section className="bg-background">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <article
            className="prose prose-sm dark:prose-invert max-w-none sm:prose-base"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: blog content is creator-authored, rendered server-side
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6">
            <LikeButton
              liked={liked}
              count={Number(blog.likeCount)}
              onToggle={handleLike}
              disabled={!isSignedIn}
            />
            <BookmarkButton
              bookmarked={bookmarked}
              onToggle={handleBookmark}
              disabled={!isSignedIn}
            />
          </div>
        </div>
      </section>

      {/* Comments zone */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Comments
          </h2>
          <div className="mt-6">
            {commentsLoading ? (
              <LoadingState variant="list" />
            ) : (
              <CommentThread
                comments={comments}
                blogId={blogId}
                onAddComment={(input) => addCommentMut.mutate(input)}
                onDeleteComment={(commentId) =>
                  deleteCommentMut.mutate({ id: commentId, blogId })
                }
                canComment={isSignedIn}
                isAdding={addCommentMut.isPending}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
