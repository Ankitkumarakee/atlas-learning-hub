import type {
  AIConversationSummary,
  BlogId,
  BlogSort,
  BlogView,
  BookmarkItem,
  Category,
  CommentId,
  CommentView,
  ContentPerformanceItem,
  ContentRef,
  ContentType,
  Conversation,
  CreatorDashboard,
  CreatorTotals,
  CreatorViewsByTypePoint,
  EngagementByType,
  ListBlogsQuery,
  ListBlogsResult,
  ListNotificationsResult,
  Message,
  MessageRole,
  NoteFileType,
  NoteInput,
  NoteListQuery,
  NoteListResult,
  NoteSort,
  NoteUpdate,
  NoteView,
  NotificationId,
  NotificationType,
  NotificationView,
  RecentCommentItem,
  Recommendation,
  SendMessageResult,
  SourceContent,
  SourceReference,
  StudentActivityPoint,
  StudentDashboard,
  StudentTotals,
  TrendingItem,
  UserRole,
  Video,
  VideoFilter,
  VideoId,
  VideoInput,
  VideoPage,
  VideoUpdate,
} from "@/backend";

export type {
  BlogView,
  BlogId,
  BlogSort,
  ListBlogsQuery,
  ListBlogsResult,
  CommentView,
  CommentId,
  NoteView,
  NoteInput,
  NoteUpdate,
  NoteListQuery,
  NoteListResult,
  NoteFileType,
  NoteSort,
  Video,
  VideoId,
  VideoInput,
  VideoUpdate,
  VideoFilter,
  VideoPage,
  Conversation,
  Message,
  SendMessageResult,
  MessageRole,
  SourceReference,
  CreatorDashboard,
  CreatorTotals,
  CreatorViewsByTypePoint,
  ContentPerformanceItem,
  EngagementByType,
  StudentDashboard,
  StudentActivityPoint,
  StudentTotals,
  BookmarkItem,
  ContentRef,
  NotificationView,
  NotificationType,
  NotificationId,
  SourceContent,
  ListNotificationsResult,
  UserRole,
  ContentType,
  Category,
  AIConversationSummary,
  Recommendation,
  TrendingItem,
  RecentCommentItem,
};

/** Frontend-friendly content kind discriminator for cards and feeds. */
export type ContentKind = "blog" | "note" | "video";

/** A normalized content card payload used by the shared ContentCard component. */
export interface ContentCardItem {
  id: bigint | string;
  kind: ContentKind;
  title: string;
  excerpt: string;
  author: string;
  createdAt: bigint;
  likeCount: bigint;
  viewCount?: bigint;
  downloadCount?: bigint;
  thumbnailUrl?: string;
  isShort?: boolean;
  durationSeconds?: bigint;
  fileType?: NoteFileType;
  subject?: string;
  category?: string;
  tags?: string[];
}

/** Role helper union for UI gating (creator is a user-level role on the platform). */
export type DisplayRole = "admin" | "creator" | "user" | "guest";
