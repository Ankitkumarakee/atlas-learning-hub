import { NoteFileType, NoteSort } from "@/backend";
import { ContentCard } from "@/components/shared/ContentCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Pagination } from "@/components/shared/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNotes } from "@/hooks/useQueries";
import type { ContentCardItem, NoteListQuery, NoteView } from "@/types";
import { useNavigate } from "@tanstack/react-router";
import { FileText, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

const PAGE_SIZE = 9n;

const FILE_TYPE_CHIPS: { value: NoteFileType; label: string }[] = [
  { value: NoteFileType.pdf, label: "PDF" },
  { value: NoteFileType.docx, label: "DOCX" },
  { value: NoteFileType.ppt, label: "PPT" },
  { value: NoteFileType.zip, label: "ZIP" },
];

const SUBJECT_SUGGESTIONS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Economics",
  "History",
];

function toCardItem(note: NoteView): ContentCardItem {
  return {
    id: note.id,
    kind: "note",
    title: note.title,
    excerpt: note.description,
    author: note.author.toText().slice(0, 8),
    createdAt: note.createdAt,
    likeCount: note.likeCount,
    downloadCount: note.downloadCount,
    fileType: note.fileType,
    subject: note.subject,
  };
}

export default function NoteListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [fileType, setFileType] = useState<NoteFileType | "all">("all");
  const [subject, setSubject] = useState("");
  const [sort, setSort] = useState<NoteSort>(NoteSort.newest);
  const [page, setPage] = useState(0);

  const query: Partial<NoteListQuery> = useMemo(
    () => ({
      page: BigInt(page),
      pageSize: PAGE_SIZE,
      sort,
      search: search.trim() || undefined,
      fileType: fileType === "all" ? undefined : fileType,
      subject: subject.trim() || undefined,
    }),
    [page, sort, search, fileType, subject],
  );

  const { data, isLoading, isError, error } = useNotes(query);

  const items = data?.items ?? [];
  const total = data ? Number(data.total) : 0;
  const pageSize = data ? Number(data.pageSize) : Number(PAGE_SIZE);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      {/* Heading */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Study Notes
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Downloadable notes, slides, and reference packs shared by the
            community. Free to read, free to download.
          </p>
        </div>
        <Button
          onClick={() => navigate({ to: "/notes/new" })}
          data-ocid="note.upload_button"
          className="self-start sm:self-auto"
        >
          <Plus className="size-4" aria-hidden />
          Upload note
        </Button>
      </header>

      {/* Filters */}
      <section
        className="mt-8 space-y-4 rounded-xl border border-border bg-card p-4 shadow-subtle sm:p-5"
        data-ocid="note.filters.section"
      >
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes by title or description…"
              aria-label="Search notes"
              data-ocid="note.search_input"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal
              className="size-4 text-muted-foreground"
              aria-hidden
            />
            <Select
              value={sort}
              onValueChange={(v) => {
                setSort(v as NoteSort);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[180px]" data-ocid="note.sort.select">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value={NoteSort.newest}
                  data-ocid="note.sort.newest"
                >
                  Newest
                </SelectItem>
                <SelectItem
                  value={NoteSort.mostDownloaded}
                  data-ocid="note.sort.mostDownloaded"
                >
                  Most downloaded
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={fileType === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => {
                setFileType("all");
                setPage(0);
              }}
              data-ocid="note.filetype.all"
            >
              All
            </Badge>
            {FILE_TYPE_CHIPS.map((chip) => (
              <Badge
                key={chip.value}
                variant={fileType === chip.value ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  setFileType(chip.value);
                  setPage(0);
                }}
                data-ocid={`note.filetype.${chip.value}`}
              >
                {chip.label}
              </Badge>
            ))}
          </div>
          <Input
            list="note-subjects"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setPage(0);
            }}
            placeholder="Filter by subject…"
            aria-label="Filter by subject"
            data-ocid="note.subject_input"
            className="sm:w-56"
          />
          <datalist id="note-subjects">
            {SUBJECT_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </section>

      {/* Results */}
      <section className="mt-8" data-ocid="note.list.section">
        {isLoading ? (
          <LoadingState variant="grid" count={6} ocid="note.loading_state" />
        ) : isError ? (
          <EmptyState
            icon={FileText}
            title="Couldn't load notes"
            description={
              error instanceof Error ? error.message : "Please try again later."
            }
            ocid="note.error_state"
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No notes found"
            description="Try adjusting your filters or search terms — or be the first to upload a note on this topic."
            actionLabel="Upload a note"
            onAction={() => navigate({ to: "/notes/new" })}
            ocid="note.empty_state"
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((note) => (
              <ContentCard key={note.id.toString()} item={toCardItem(note)} />
            ))}
          </div>
        )}
      </section>

      {/* Pagination */}
      {!isLoading && !isError && total > pageSize && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          className="mt-10"
          ocid="note.pagination"
        />
      )}
    </div>
  );
}
