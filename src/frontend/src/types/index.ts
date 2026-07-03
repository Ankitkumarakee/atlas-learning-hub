import type {
  AIConversationSummary,
  AdminDashboard,
  AdminTotals,
  BlogId,
  BlogSort,
  BlogView,
  BookmarkItem,
  Category,
  CommentId,
  CommentView,
  ContentDistribution,
  ContentPerformanceItem,
  ContentRef,
  ContentType,
  Conversation,
  CreatorDashboard,
  CreatorTotals,
  DatePoint,
  EngagementByType,
  ListBlogsQuery,
  ListBlogsResult,
  ListNotificationsResult,
  Message,
  MessageRole,
  ModerationQueueItem,
  ModerationStatus,
  ModerationTarget,
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
  PlatformGrowthPoint,
  SendMessageResult,
  SourceContent,
  SourceReference,
  StudentDashboard,
  StudentTotals,
  UserManagementItem,
  UserRole,
  UserStatus,
  Video,
  VideoFilter,
  VideoId,
  VideoInput,
  VideoPage,
  VideoSort,
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
  VideoSort,
  Conversation,
  Message,
  SendMessageResult,
  MessageRole,
  SourceReference,
  CreatorDashboard,
  CreatorTotals,
  ContentPerformanceItem,
  EngagementByType,
  DatePoint,
  StudentDashboard,
  StudentTotals,
  BookmarkItem,
  ContentRef,
  AdminDashboard,
  AdminTotals,
  ContentDistribution,
  ModerationQueueItem,
  ModerationStatus,
  ModerationTarget,
  PlatformGrowthPoint,
  UserManagementItem,
  UserStatus,
  NotificationView,
  NotificationType,
  NotificationId,
  SourceContent,
  ListNotificationsResult,
  UserRole,
  ContentType,
  Category,
  AIConversationSummary,
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
