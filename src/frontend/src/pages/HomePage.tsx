import type { BlogView, NoteView, Video } from "@/backend";
import { ContentCard } from "@/components/shared/ContentCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import {
  BlogSort,
  NoteSort,
  VideoSort,
  useBlogs,
  useNotes,
  useVideos,
} from "@/hooks/useQueries";
import type { ContentCardItem } from "@/types";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  FileText,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";

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
/* Hero                                                               */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-card">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, var(--primary) 0, transparent 40%), radial-gradient(circle at 80% 60%, var(--accent) 0, transparent 45%)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="size-3.5 text-accent" aria-hidden />
            Free knowledge, shared by creators
          </div>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            Atlas Learning Hub
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Browse blogs, study notes, and videos from a community of educators
            — and ask the AI tutor anything, grounded in your uploads and public
            content.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" data-ocid="home.hero.blogs_button">
              <Link to="/blogs">
                <BookOpen className="mr-2 size-4" aria-hidden />
                Read blogs
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              data-ocid="home.hero.videos_button"
            >
              <Link to="/videos">
                <PlayCircle className="mr-2 size-4" aria-hidden />
                Watch videos
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              data-ocid="home.hero.tutor_button"
            >
              <Link to="/tutor">
                <Sparkles className="mr-2 size-4" aria-hidden />
                Ask the AI tutor
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section heading                                                    */
/* ------------------------------------------------------------------ */

function SectionHeading({
  title,
  description,
  viewAllHref,
  viewAllLabel,
}: {
  title: string;
  description?: string;
  viewAllHref: string;
  viewAllLabel: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <Button
        asChild
        variant="ghost"
        size="sm"
        data-ocid={`home.section.${viewAllLabel.toLowerCase().replace(/\s/g, "_")}.link`}
      >
        <Link to={viewAllHref}>
          {viewAllLabel}
          <ArrowRight className="ml-1.5 size-3.5" aria-hidden />
        </Link>
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Featured content                                                    */
/* ------------------------------------------------------------------ */

function FeaturedSection() {
  const blogs = useBlogs({ page: 0n, pageSize: 6n, sort: BlogSort.newest });
  const notes = useNotes({ page: 0n, pageSize: 4n, sort: NoteSort.newest });
  const videos = useVideos({ page: 0n, pageSize: 6n, sort: VideoSort.newest });

  const anyLoading = blogs.isLoading || notes.isLoading || videos.isLoading;
  const blogItems = blogs.data?.items ?? [];
  const noteItems = notes.data?.items ?? [];
  const videoItems = videos.data?.items ?? [];

  // Mixed grid: interleave blogs, notes, videos for a varied feed.
  const mixed: ContentCardItem[] = [];
  const maxLen = Math.max(
    blogItems.length,
    noteItems.length,
    videoItems.length,
  );
  for (let i = 0; i < maxLen; i++) {
    if (blogItems[i]) mixed.push(blogToCard(blogItems[i]));
    if (videoItems[i]) mixed.push(videoToCard(videoItems[i]));
    if (noteItems[i]) mixed.push(noteToCard(noteItems[i]));
  }

  return (
    <section className="bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading
          title="Featured content"
          description="The latest blogs, notes, and videos from the community."
          viewAllHref="/search"
          viewAllLabel="Browse all"
        />

        {anyLoading ? (
          <LoadingState
            variant="grid"
            count={6}
            ocid="home.featured.loading_state"
          />
        ) : mixed.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No content yet"
            description="Be the first to publish a blog, note, or video on Atlas."
            ocid="home.featured.empty_state"
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {mixed.map((item, i) => (
              <motion.div
                key={`${item.kind}-${item.id.toString()}`}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  duration: 0.35,
                  delay: (i % 3) * 0.08,
                  ease: "easeOut",
                }}
              >
                <ContentCard item={item} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <Hero />
      <FeaturedSection />
    </div>
  );
}
