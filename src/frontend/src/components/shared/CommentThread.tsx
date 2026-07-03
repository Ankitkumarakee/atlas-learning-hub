import type { BlogId, CommentId, CommentView } from "@/backend";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Heart, MessageSquare, Send } from "lucide-react";
import { useState } from "react";

interface CommentThreadProps {
  comments: CommentView[];
  blogId: BlogId;
  onAddComment: (input: {
    blogId: BlogId;
    parentCommentId: CommentId | null;
    content: string;
  }) => void;
  onDeleteComment?: (id: CommentId) => void;
  canComment?: boolean;
  isAdding?: boolean;
}

function initials(principal: string): string {
  const tail = principal.split("-").pop() ?? principal;
  return tail.slice(0, 2).toUpperCase();
}

function formatDate(ts: bigint): string {
  const ms = Number(ts);
  if (!ms) return "";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

interface CommentNode extends CommentView {
  replies: CommentNode[];
}

function buildTree(comments: CommentView[]): CommentNode[] {
  const byId = new Map<CommentId, CommentNode>();
  const roots: CommentNode[] = [];
  for (const c of comments) {
    byId.set(c.id, { ...c, replies: [] });
  }
  for (const c of comments) {
    const node = byId.get(c.id)!;
    if (c.parentCommentId !== undefined && byId.has(c.parentCommentId)) {
      byId.get(c.parentCommentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function CommentItem({
  node,
  depth,
  onDelete,
}: {
  node: CommentNode;
  depth: number;
  onDelete?: (id: CommentId) => void;
}) {
  return (
    <div
      className={cn("flex gap-3", depth > 0 && "ml-10")}
      data-ocid={`comment.item.${node.id}`}
    >
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className="bg-primary/10 text-xs text-primary">
          {initials(node.author.toText())}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-medium text-foreground">
              {node.author.toText().slice(0, 12)}…
            </span>
            <span className="text-[10px] text-muted-foreground">
              {formatDate(node.createdAt)}
            </span>
          </div>
          <p className="mt-1 break-words text-sm text-foreground/90">
            {node.content}
          </p>
        </div>
        <div className="mt-1 flex items-center gap-3 px-1 text-xs text-muted-foreground">
          <button
            type="button"
            className="flex items-center gap-1 hover:text-accent"
            data-ocid={`comment.like_button.${node.id}`}
          >
            <Heart className="size-3" aria-hidden />
            {Number(node.likeCount)}
          </button>
          {onDelete && (
            <button
              type="button"
              className="hover:text-destructive"
              onClick={() => onDelete(node.id)}
              data-ocid={`comment.delete_button.${node.id}`}
            >
              Delete
            </button>
          )}
        </div>
        {node.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {node.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                node={reply}
                depth={depth + 1}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentThread({
  comments,
  blogId,
  onAddComment,
  onDeleteComment,
  canComment = true,
  isAdding = false,
}: CommentThreadProps) {
  const [draft, setDraft] = useState("");
  const tree = buildTree(comments);

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAddComment({ blogId, parentCommentId: null, content: trimmed });
    setDraft("");
  };

  return (
    <section className="space-y-5" data-ocid="comment.section">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-5 text-primary" aria-hidden />
        <h3 className="font-display text-lg font-semibold text-foreground">
          Discussion ({comments.length})
        </h3>
      </div>

      {canComment && (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share your thoughts…"
            rows={3}
            data-ocid="comment.input"
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={submit}
              disabled={!draft.trim() || isAdding}
              data-ocid="comment.submit_button"
            >
              <Send className="size-4" aria-hidden />
              {isAdding ? "Posting…" : "Post comment"}
            </Button>
          </div>
        </div>
      )}

      {!canComment && (
        <p className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <Link to="/profile" className="text-primary hover:underline">
            Sign in
          </Link>{" "}
          to join the discussion.
        </p>
      )}

      <Separator />

      {tree.length === 0 ? (
        <div
          className="py-8 text-center text-sm text-muted-foreground"
          data-ocid="comment.empty_state"
        >
          No comments yet. Be the first to share your thoughts.
        </div>
      ) : (
        <div className="space-y-4">
          {tree.map((node) => (
            <CommentItem
              key={node.id}
              node={node}
              depth={0}
              onDelete={onDeleteComment}
            />
          ))}
        </div>
      )}
    </section>
  );
}
