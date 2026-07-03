import { FileUpload } from "@/components/shared/FileUpload";
import type { UploadedFile } from "@/components/shared/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCreateVideo } from "@/hooks/useQueries";
import type { Category, VideoInput } from "@/types";
import { ExternalBlob } from "@caffeineai/object-storage";
import { useNavigate } from "@tanstack/react-router";
import { Film, Upload, Video as VideoIcon } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES: Category[] = [
  "Mathematics",
  "Science",
  "Programming",
  "Languages",
  "Humanities",
  "Business",
  "Arts",
  "Other",
];

/* ------------------------------------------------------------------ */
/* Upload helper                                                      */
/* ------------------------------------------------------------------ */

/**
 * Wraps ExternalBlob.fromBytes so FileUpload can stream a browser File
 * through the object-storage gateway and return the resulting blobId
 * (the direct URL) string the backend stores.
 */
function makeUploader() {
  return async (
    file: File,
    onProgress?: (pct: number) => void,
  ): Promise<string> => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const blob = ExternalBlob.fromBytes(
      bytes,
      file.type,
      file.name,
    ).withUploadProgress((pct) => onProgress?.(pct));
    return blob.getDirectURL();
  };
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function VideoUploadPage() {
  const navigate = useNavigate();
  const createVideo = useCreateVideo();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("Mathematics");
  const [isShort, setIsShort] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [published, setPublished] = useState(true);

  const [videoFile, setVideoFile] = useState<UploadedFile | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<UploadedFile | null>(null);

  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    !!videoFile &&
    !!thumbnailFile &&
    durationSeconds > 0 &&
    !createVideo.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !videoFile || !thumbnailFile) return;

    const input: VideoInput = {
      title: title.trim(),
      description: description.trim(),
      category,
      isShort,
      videoBlobId: videoFile.blobId,
      thumbnailBlobId: thumbnailFile.blobId,
      durationSeconds: BigInt(Math.max(1, Math.floor(durationSeconds))),
      published,
    };

    createVideo.mutate(input, {
      onSuccess: (video) => {
        toast.success("Video published");
        navigate({ to: "/videos/$id", params: { id: video.id.toString() } });
      },
      onError: (err) => {
        toast.error(`Upload failed: ${String(err)}`);
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header band */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Film className="size-3.5" aria-hidden />
            New video
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Upload a video
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Share educational content with the community. Upload your video
            file, add a thumbnail, and fill in the details below.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="bg-background">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* File uploads */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <Label
                  htmlFor="video-file"
                  data-ocid="video.upload.video_label"
                >
                  Video file
                </Label>
                <FileUpload
                  upload={makeUploader()}
                  accept="video/*"
                  label="Upload video"
                  hint="MP4, WebM, or MOV. Drag and drop or click to browse."
                  onUploaded={(files) => setVideoFile(files[0] ?? null)}
                  ocid="video.upload.video_file"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="thumbnail-file"
                  data-ocid="video.upload.thumbnail_label"
                >
                  Thumbnail image
                </Label>
                <FileUpload
                  upload={makeUploader()}
                  accept="image/*"
                  label="Upload thumbnail"
                  hint="JPG, PNG, or WebP. Recommended 16:9 aspect ratio."
                  onUploaded={(files) => setThumbnailFile(files[0] ?? null)}
                  ocid="video.upload.thumbnail_file"
                />
              </div>
            </motion.div>

            {/* Metadata */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="space-y-5 rounded-xl border border-border bg-card p-6"
            >
              <div className="space-y-2">
                <Label htmlFor="title" data-ocid="video.upload.title_label">
                  Title
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="A clear, descriptive title"
                  maxLength={120}
                  required
                  data-ocid="video.upload.title_input"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  data-ocid="video.upload.description_label"
                >
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what viewers will learn from this video..."
                  rows={5}
                  maxLength={2000}
                  required
                  data-ocid="video.upload.description_textarea"
                />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label data-ocid="video.upload.category_label">
                    Category
                  </Label>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as Category)}
                  >
                    <SelectTrigger
                      aria-label="Select category"
                      data-ocid="video.upload.category_select"
                    >
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent data-ocid="video.upload.category_dropdown_menu">
                      {CATEGORIES.map((c) => (
                        <SelectItem
                          key={c}
                          value={c}
                          data-ocid={`video.upload.category_select.${c.toLowerCase()}`}
                        >
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="duration"
                    data-ocid="video.upload.duration_label"
                  >
                    Duration (seconds)
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    min={1}
                    max={86400}
                    step={1}
                    value={durationSeconds || ""}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setDurationSeconds(
                        Number.isFinite(v) && v > 0 ? Math.floor(v) : 0,
                      );
                    }}
                    placeholder="e.g. 180"
                    required
                    data-ocid="video.upload.duration_input"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="is-short"
                      className="text-sm font-medium"
                      data-ocid="video.upload.isshort_label"
                    >
                      Short-form video
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Vertical shorts appear in the Shorts row.
                    </p>
                  </div>
                  <Switch
                    id="is-short"
                    checked={isShort}
                    onCheckedChange={setIsShort}
                    data-ocid="video.upload.isshort_switch"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="published"
                      className="text-sm font-medium"
                      data-ocid="video.upload.published_label"
                    >
                      Publish immediately
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Visible to everyone when on.
                    </p>
                  </div>
                  <Switch
                    id="published"
                    checked={published}
                    onCheckedChange={setPublished}
                    data-ocid="video.upload.published_switch"
                  />
                </div>
              </div>
            </motion.div>

            {/* Validation summary */}
            {!canSubmit && (
              <div
                className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground"
                data-ocid="video.upload.validation_hint"
              >
                <p className="font-medium text-foreground">
                  Before you publish:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
                  {!videoFile && <li>Upload a video file</li>}
                  {!thumbnailFile && <li>Upload a thumbnail image</li>}
                  {!title.trim() && <li>Add a title</li>}
                  {!description.trim() && <li>Add a description</li>}
                  {durationSeconds <= 0 && (
                    <li>Set the video duration in seconds</li>
                  )}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/videos" })}
                disabled={createVideo.isPending}
                data-ocid="video.upload.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit}
                data-ocid="video.upload.submit_button"
              >
                {createVideo.isPending ? (
                  <>
                    <VideoIcon className="size-4 animate-pulse" aria-hidden />
                    Publishing…
                  </>
                ) : (
                  <>
                    <Upload className="size-4" aria-hidden />
                    {published ? "Publish video" : "Save draft"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
