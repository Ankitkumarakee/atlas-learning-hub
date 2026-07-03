import { NoteFileType } from "@/backend";
import { FileUpload } from "@/components/shared/FileUpload";
import type { UploadedFile } from "@/components/shared/FileUpload";
import { Badge } from "@/components/ui/badge";
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
import { useCreateNote } from "@/hooks/useQueries";
import type { NoteInput } from "@/types";
import { ExternalBlob } from "@caffeineai/object-storage";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function detectFileType(name: string): NoteFileType | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return NoteFileType.pdf;
  if (lower.endsWith(".docx")) return NoteFileType.docx;
  if (lower.endsWith(".ppt") || lower.endsWith(".pptx"))
    return NoteFileType.ppt;
  if (lower.endsWith(".zip")) return NoteFileType.zip;
  return null;
}

const FILE_TYPE_LABEL: Record<NoteFileType, string> = {
  [NoteFileType.pdf]: "PDF",
  [NoteFileType.docx]: "DOCX",
  [NoteFileType.ppt]: "PPT",
  [NoteFileType.zip]: "ZIP",
};

export default function NoteUploadPage() {
  const navigate = useNavigate();
  const createNote = useCreateNote();

  const [uploaded, setUploaded] = useState<UploadedFile | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [fileType, setFileType] = useState<NoteFileType>(NoteFileType.pdf);
  const [published, setPublished] = useState(true);

  const upload = async (file: File, onProgress?: (pct: number) => void) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const blob = ExternalBlob.fromBytes(
      bytes,
      file.type || "application/octet-stream",
      file.name,
    );
    if (onProgress) {
      blob.withUploadProgress(onProgress);
    }
    await blob.getBytes();
    return blob.getDirectURL();
  };

  const handleUploaded = (files: UploadedFile[]) => {
    const file = files[0] ?? null;
    setUploaded(file);
    if (file) {
      const detected = detectFileType(file.name);
      if (detected) setFileType(detected);
      if (!title) {
        const base = file.name.replace(/\.[^.]+$/, "");
        setTitle(base);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploaded) {
      toast.error("Please upload a file first.");
      return;
    }
    if (!title.trim() || !subject.trim()) {
      toast.error("Title and subject are required.");
      return;
    }
    const input: NoteInput = {
      title: title.trim(),
      description: description.trim(),
      subject: subject.trim(),
      fileType,
      blobId: uploaded.blobId,
      fileSize: BigInt(uploaded.size),
      published,
    };
    try {
      await createNote.mutateAsync(input);
      toast.success("Note published.");
      navigate({ to: "/notes" });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't publish note.",
      );
    }
  };

  const submitting = createNote.isPending;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: "/notes" })}
        data-ocid="note.upload.back_button"
        className="mb-6"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to notes
      </Button>

      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Upload a note
        </h1>
        <p className="mt-2 text-muted-foreground">
          Share study notes, slides, or reference packs. Free for everyone on
          the platform.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-8"
        data-ocid="note.upload.form"
      >
        {/* File upload */}
        <section
          className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-subtle"
          data-ocid="note.upload.file_section"
        >
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              File
            </h2>
            <p className="text-sm text-muted-foreground">
              PDF, DOCX, PPT/PPTX, or ZIP. Max one file per note.
            </p>
          </div>
          <FileUpload
            upload={upload}
            accept=".pdf,.docx,.ppt,.pptx,.zip"
            label="Drop your note here"
            hint="or click to browse — PDF, DOCX, PPT, ZIP"
            onUploaded={handleUploaded}
            ocid="note.upload"
          />
          {uploaded && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" data-ocid="note.upload.filetype_badge">
                {FILE_TYPE_LABEL[fileType]}
              </Badge>
              <span className="truncate">{uploaded.name}</span>
            </div>
          )}
        </section>

        {/* Metadata */}
        <section
          className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-subtle"
          data-ocid="note.upload.metadata_section"
        >
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Details
            </h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note-title" data-ocid="note.upload.title_label">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Linear Algebra — Eigenvalues Cheat Sheet"
              required
              data-ocid="note.upload.title_input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note-subject" data-ocid="note.upload.subject_label">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="note-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Mathematics"
              required
              data-ocid="note.upload.subject_input"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="note-description"
              data-ocid="note.upload.description_label"
            >
              Description
            </Label>
            <Textarea
              id="note-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's inside? Who is this for?"
              rows={4}
              data-ocid="note.upload.description_input"
            />
          </div>

          <div className="space-y-2">
            <Label data-ocid="note.upload.filetype_label">File type</Label>
            <Select
              value={fileType}
              onValueChange={(v) => setFileType(v as NoteFileType)}
            >
              <SelectTrigger
                className="w-full sm:w-48"
                data-ocid="note.upload.filetype_select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FILE_TYPE_LABEL) as NoteFileType[]).map((ft) => (
                  <SelectItem
                    key={ft}
                    value={ft}
                    data-ocid={`note.upload.filetype.${ft}`}
                  >
                    {FILE_TYPE_LABEL[ft]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="space-y-0.5">
              <Label
                htmlFor="note-published"
                className="text-sm font-medium"
                data-ocid="note.upload.published_label"
              >
                Publish immediately
              </Label>
              <p className="text-xs text-muted-foreground">
                If off, the note is saved as a draft only you can see.
              </p>
            </div>
            <Switch
              id="note-published"
              checked={published}
              onCheckedChange={setPublished}
              data-ocid="note.upload.published_switch"
            />
          </div>
        </section>

        {/* Info note */}
        <div
          className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground"
          data-ocid="note.upload.info"
        >
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <p>
            Uploaded notes are stored via object-storage and indexed for the AI
            tutor's RAG search across public platform content.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/notes" })}
            disabled={submitting}
            data-ocid="note.upload.cancel_button"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || !uploaded}
            data-ocid="note.upload.submit_button"
          >
            {submitting ? "Publishing…" : "Publish note"}
          </Button>
        </div>
      </form>
    </div>
  );
}
