import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useBlog, useCreateBlog, useUpdateBlog } from "@/hooks/useQueries";
import { ArrowLeft, Lock, Save } from "lucide-react";
import { toast } from "sonner";

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block"],
    ["link"],
    ["clean"],
  ],
};

const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "bullet",
  "blockquote",
  "code-block",
  "link",
];

export default function BlogEditorPage() {
  const { id } = useParams({ strict: false }) as { id?: string };
  const navigate = useNavigate();
  const { isCreator } = useAuth();

  const isEditMode = !!id;
  const blogId = id ? BigInt(id) : undefined;

  const blogQuery = useBlog(blogId);
  const blog = blogQuery.data;
  const isLoading = blogQuery.isLoading;
  const createMut = useCreateBlog();
  const updateMut = useUpdateBlog();

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [published, setPublished] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Prefill in edit mode
  useEffect(() => {
    if (isEditMode && blog && !hydrated) {
      setTitle(blog.title);
      setExcerpt(blog.excerpt);
      setContent(blog.content);
      setTags(blog.tags.join(", "));
      setPublished(blog.published);
      setHydrated(true);
    }
    if (!isEditMode) {
      setHydrated(true);
    }
  }, [isEditMode, blog, hydrated]);

  const isPending = createMut.isPending || updateMut.isPending;

  const parsedTags = useMemo(
    () =>
      tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [tags],
  );

  if (!isCreator) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <EmptyState
            icon={Lock}
            title="Creator access required"
            description="Only approved creators can write blogs. Sign in with a creator account to continue."
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

  if (isEditMode && isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <LoadingState variant="text" />
        </div>
      </div>
    );
  }

  const canSubmit =
    title.trim().length > 0 && content.trim().length > 0 && !isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const payload = {
      title: title.trim(),
      content,
      excerpt: excerpt.trim() || title.trim(),
      tags: parsedTags,
      coverImageBlobId: null,
      published,
    };

    try {
      if (isEditMode && blogId) {
        await updateMut.mutateAsync({ id: blogId, ...payload });
        toast.success("Blog updated.");
      } else {
        await createMut.mutateAsync(payload);
        toast.success(published ? "Blog published." : "Draft saved.");
      }
      navigate({ to: "/blogs" });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : isEditMode
            ? "Couldn't save changes."
            : "Couldn't publish blog.",
      );
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
            className="mb-3"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {isEditMode ? "Edit blog" : "Write a new blog"}
          </h1>
        </div>
      </header>

      {/* Editor zone */}
      <section className="bg-background">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="blog-title">Title</Label>
            <Input
              id="blog-title"
              data-ocid="blog.title_input"
              type="text"
              placeholder="Give your blog a clear, compelling title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={140}
            />
          </div>

          {/* Excerpt */}
          <div className="space-y-2">
            <Label htmlFor="blog-excerpt">Excerpt</Label>
            <Textarea
              id="blog-excerpt"
              data-ocid="blog.excerpt_input"
              placeholder="A short summary shown in the blog list (optional)"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              maxLength={280}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="blog-tags">Tags</Label>
            <Input
              id="blog-tags"
              data-ocid="blog.tags_input"
              type="text"
              placeholder="comma, separated, tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Separate tags with commas.
            </p>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="blog-content">Content</Label>
            <div
              data-ocid="blog.content_editor"
              className="blog-editor-wrapper"
            >
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Start writing your blog..."
                className="min-h-[320px]"
              />
            </div>
          </div>

          {/* Publish toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
            <div>
              <Label htmlFor="blog-publish" className="text-sm font-medium">
                Publish immediately
              </Label>
              <p className="text-xs text-muted-foreground">
                Published blogs are visible to everyone. Unpublished drafts are
                only visible to you.
              </p>
            </div>
            <Switch
              id="blog-publish"
              data-ocid="blog.publish_switch"
              checked={published}
              onCheckedChange={setPublished}
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
            <Button
              data-ocid="blog.cancel_button"
              variant="secondary"
              onClick={() => navigate({ to: "/blogs" })}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              data-ocid="blog.save_button"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              <Save className="mr-2 h-4 w-4" />
              {isPending
                ? "Saving..."
                : isEditMode
                  ? "Save changes"
                  : "Publish blog"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
