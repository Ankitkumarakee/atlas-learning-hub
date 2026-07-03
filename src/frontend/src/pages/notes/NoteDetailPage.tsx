import { ContentType, NoteFileType } from "@/backend";
import { BookmarkButton } from "@/components/shared/BookmarkButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { LikeButton } from "@/components/shared/LikeButton";
import { LoadingState } from "@/components/shared/LoadingState";
import { RelatedContentSection } from "@/components/shared/RelatedContentSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useBackend } from "@/hooks/useBackend";
import { useLikeNote, useNote, useRelatedContent } from "@/hooks/useQueries";
import { recommendationsToCardItems } from "@/lib/recommendations";
import type { NoteView } from "@/types";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  Download,
  FileText,
  HardDrive,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const FILE_TYPE_LABEL: Record<NoteFileType, string> = {
  [NoteFileType.pdf]: "PDF",
  [NoteFileType.docx]: "DOCX",
  [NoteFileType.ppt]: "PPT",
  [NoteFileType.zip]: "ZIP",
};

function formatBytes(bytes: bigint): string {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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

export default function NoteDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const noteId = id ? BigInt(id) : undefined;
  const navigate = useNavigate();
  const { isSignedIn, signIn } = useAuth();
  const { actor } = useBackend();
  const { data: note, isLoading, isError } = useNote(noteId);
  const relatedQuery = useRelatedContent(ContentType.note, noteId, 4);
  const relatedItems = relatedQuery.data
    ? recommendationsToCardItems(relatedQuery.data)
    : [];
  const relatedLoading = relatedQuery.isLoading;
  const likeMutation = useLikeNote();
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleLike = () => {
    if (!isSignedIn) {
      toast.error("Please sign in to like this note.");
      signIn();
      return;
    }
    if (noteId === undefined) return;
    setLiked((v) => !v);
    likeMutation.mutate(noteId, {
      onError: () => {
        setLiked((v) => !v);
        toast.error("Couldn't update like.");
      },
    });
  };

  const handleBookmark = async () => {
    if (!isSignedIn) {
      toast.error("Please sign in to bookmark this note.");
      signIn();
      return;
    }
    if (noteId === undefined || !actor) return;
    setBookmarked((v) => !v);
    try {
      if (bookmarked) {
        await actor.unbookmarkNote(noteId);
      } else {
        await actor.bookmarkNote(noteId);
      }
    } catch {
      setBookmarked((v) => !v);
      toast.error("Couldn't update bookmark.");
    }
  };

  const handleDownload = async (current: NoteView) => {
    if (downloading) return;
    setDownloading(true);
    try {
      if (actor && noteId !== undefined) {
        await actor.incrementDownload(noteId);
      }
      const a = document.createElement("a");
      a.href = current.blobId;
      a.download = current.title || "note";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Download started.");
    } catch {
      toast.error("Couldn't start download.");
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <LoadingState variant="card" count={4} ocid="note.loading_state" />
      </div>
    );
  }

  if (isError || !note) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <EmptyState
          icon={FileText}
          title="Note not found"
          description="This note may have been removed or the link is incorrect."
          actionLabel="Back to notes"
          onAction={() => navigate({ to: "/notes" })}
          ocid="note.error_state"
        />
      </div>
    );
  }

  const likeCount = Number(note.likeCount) + (liked ? 1 : 0);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: "/notes" })}
        data-ocid="note.back_button"
        className="mb-6"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to notes
      </Button>

      <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-subtle">
        {/* Header */}
        <header className="space-y-4 border-b border-border/60 bg-muted/20 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" data-ocid="note.filetype_badge">
              <FileText className="mr-1 size-3" aria-hidden />
              {FILE_TYPE_LABEL[note.fileType]}
            </Badge>
            {note.subject && (
              <Badge variant="outline" data-ocid="note.subject_badge">
                {note.subject}
              </Badge>
            )}
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {note.title}
          </h1>
          <p className="text-muted-foreground">{note.description}</p>
        </header>

        {/* Meta */}
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 sm:p-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="size-4" aria-hidden />
              <span className="truncate">
                by {note.author.toText().slice(0, 12)}…
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="size-4" aria-hidden />
              <span>Published {formatDate(note.createdAt)}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <HardDrive className="size-4" aria-hidden />
              <span>{formatBytes(note.fileSize)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Download className="size-4" aria-hidden />
              <span>{Number(note.downloadCount)} downloads</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 p-6 sm:p-8">
          <Button
            onClick={() => handleDownload(note)}
            disabled={downloading}
            data-ocid="note.download_button"
          >
            <Download className="size-4" aria-hidden />
            {downloading ? "Preparing…" : "Download"}
          </Button>
          <LikeButton
            liked={liked}
            count={likeCount}
            onToggle={handleLike}
            ocid={`note.like_button.${note.id.toString()}`}
          />
          <BookmarkButton
            bookmarked={bookmarked}
            onToggle={handleBookmark}
            label={bookmarked ? "Saved" : "Save"}
            ocid={`note.bookmark_button.${note.id.toString()}`}
          />
        </div>
      </article>

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
              ocid="note.related.loading_state"
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
            ocid="note.related"
          />
        </section>
      ) : null}

      {/* Footer link */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Looking for more?{" "}
        <Link
          to="/notes"
          className="font-medium text-primary hover:underline"
          data-ocid="note.browse_link"
        >
          Browse all notes
        </Link>
      </p>
    </div>
  );
}
