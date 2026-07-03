import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileIcon, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";

export interface UploadedFile {
  blobId: string;
  name: string;
  size: number;
  contentType: string;
}

interface FileUploadProps {
  /** StorageClient.putFile returns { hash }. Caller injects the client. */
  upload: (file: File, onProgress?: (pct: number) => void) => Promise<string>;
  accept?: string;
  label?: string;
  hint?: string;
  multiple?: boolean;
  onUploaded: (files: UploadedFile[]) => void;
  className?: string;
  ocid?: string;
}

export function FileUpload({
  upload,
  accept,
  label = "Upload file",
  hint = "Drag and drop or click to browse",
  multiple = false,
  onUploaded,
  className,
  ocid = "file.upload",
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadedFile[]>([]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setProgress(0);
    try {
      const results: UploadedFile[] = [];
      for (const file of Array.from(files)) {
        const blobId = await upload(file, (pct) => setProgress(pct));
        results.push({
          blobId,
          name: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream",
        });
      }
      setUploaded((prev) => {
        const next = multiple ? [...prev, ...results] : results;
        onUploaded(next);
        return next;
      });
      setProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setProgress(null);
    }
  };

  const removeFile = (idx: number) => {
    setUploaded((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      onUploaded(next);
      return next;
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        data-ocid={ocid}
        className={cn(
          "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center transition-smooth hover:border-primary/50 hover:bg-muted/50",
          dragging && "border-primary bg-primary/5",
        )}
      >
        <UploadCloud className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
          data-ocid={`${ocid}.input`}
        />
      </button>

      {progress !== null && (
        <div className="space-y-1" data-ocid={`${ocid}.loading_state`}>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Uploading… {progress}%
          </p>
        </div>
      )}

      {error && (
        <p
          className="text-sm text-destructive"
          data-ocid={`${ocid}.error_state`}
        >
          {error}
        </p>
      )}

      {uploaded.length > 0 && (
        <ul className="space-y-2" data-ocid={`${ocid}.success_state`}>
          {uploaded.map((file, idx) => (
            <li
              key={file.blobId}
              className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
              data-ocid={`${ocid}.item.${idx + 1}`}
            >
              <FileIcon className="size-4 text-primary" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {file.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(0)} KB
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => removeFile(idx)}
                aria-label="Remove file"
                data-ocid={`${ocid}.delete_button.${idx + 1}`}
              >
                <X className="size-3.5" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
