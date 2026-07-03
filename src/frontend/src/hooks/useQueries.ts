import {
  type AdminDashboard,
  type BlogId,
  BlogSort,
  type BlogView,
  type CommentId,
  type CommentView,
  ContentType,
  type Conversation,
  type CreatorDashboard,
  type ListBlogsQuery,
  type ListBlogsResult,
  type ListNotificationsResult,
  type Message,
  type ModerationTarget,
  type NoteInput,
  type NoteListQuery,
  type NoteListResult,
  NoteSort,
  type NoteUpdate,
  type NoteView,
  type NotificationId,
  type Recommendation,
  type SendMessageResult,
  type StudentDashboard,
  type TrendingItem,
  type UserRole__1,
  type Video,
  type VideoFilter,
  type VideoId,
  type VideoInput,
  type VideoPage,
  type VideoUpdate,
} from "@/backend";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBackend } from "./useBackend";

const PAGE_SIZE = 9n;

/**
 * Local VideoSort enum. The backend exports `VideoSort` only as a variant type
 * (not a runtime value) in `@/backend`, so we mirror the variant string values
 * here. The Candid encoder uses string equality, so a local string enum with
 * matching values works at runtime. Cast to the `VideoFilter["sort"]` variant
 * type when building a `VideoFilter`.
 */
export enum VideoSort {
  mostBookmarked = "mostBookmarked",
  newest = "newest",
  mostLiked = "mostLiked",
  mostViewed = "mostViewed",
}

const defaultBlogQuery: ListBlogsQuery = {
  page: 0n,
  pageSize: PAGE_SIZE,
  sort: BlogSort.newest,
};

const defaultNoteQuery: NoteListQuery = {
  page: 0n,
  pageSize: PAGE_SIZE,
  sort: NoteSort.newest,
};

const defaultVideoFilter: VideoFilter = {
  page: 0n,
  pageSize: PAGE_SIZE,
  sort: VideoSort.newest as VideoFilter["sort"],
};

/* ------------------------------------------------------------------ */
/* Blogs                                                              */
/* ------------------------------------------------------------------ */

export function useBlogs(query?: Partial<ListBlogsQuery>) {
  const { actor, isFetching } = useBackend();
  const q: ListBlogsQuery = { ...defaultBlogQuery, ...query };
  return useQuery<ListBlogsResult>({
    queryKey: ["blogs", q],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.listBlogs(q);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useBlog(id: BlogId | undefined) {
  const { actor, isFetching } = useBackend();
  return useQuery<BlogView | null>({
    queryKey: ["blog", id?.toString()],
    queryFn: async () => {
      if (!actor || id === undefined) return null;
      return actor.getBlog(id);
    },
    enabled: !!actor && !isFetching && id !== undefined,
  });
}

export function useCreateBlog() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      content: string;
      excerpt: string;
      tags: string[];
      coverImageBlobId: Uint8Array | null;
      published: boolean;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.createBlog(
        input.title,
        input.content,
        input.excerpt,
        input.tags,
        input.coverImageBlobId,
        input.published,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blogs"] });
    },
  });
}

export function useUpdateBlog() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: {
      id: BlogId;
      title: string;
      content: string;
      excerpt: string;
      tags: string[];
      coverImageBlobId: Uint8Array | null;
      published: boolean;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.updateBlog(
        input.id,
        input.title,
        input.content,
        input.excerpt,
        input.tags,
        input.coverImageBlobId,
        input.published,
      );
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["blogs"] });
      qc.invalidateQueries({ queryKey: ["blog", data.id.toString()] });
    },
  });
}

export function useDeleteBlog() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (id: BlogId) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.deleteBlog(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blogs"] });
    },
  });
}

export function useLikeBlog() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (id: BlogId) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.likeBlog(id);
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["blog", id.toString()] });
      qc.invalidateQueries({ queryKey: ["blogs"] });
    },
  });
}

export function useUnlikeBlog() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (id: BlogId) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.unlikeBlog(id);
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["blog", id.toString()] });
      qc.invalidateQueries({ queryKey: ["blogs"] });
    },
  });
}

export function useBookmarkBlog() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (id: BlogId) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.bookmarkBlog(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-dashboard"] });
    },
  });
}

export function useUnbookmarkBlog() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (id: BlogId) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.unbookmarkBlog(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-dashboard"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Comments                                                           */
/* ------------------------------------------------------------------ */

export function useComments(blogId: BlogId | undefined) {
  const { actor, isFetching } = useBackend();
  return useQuery<CommentView[]>({
    queryKey: ["comments", blogId?.toString()],
    queryFn: async () => {
      if (!actor || blogId === undefined) return [];
      return actor.getComments(blogId);
    },
    enabled: !!actor && !isFetching && blogId !== undefined,
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: {
      blogId: BlogId;
      parentCommentId: CommentId | null;
      content: string;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.addComment(
        input.blogId,
        input.parentCommentId,
        input.content,
      );
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: ["comments", input.blogId.toString()],
      });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: { id: CommentId; blogId: BlogId }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.deleteComment(input.id);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: ["comments", input.blogId.toString()],
      });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Notes                                                              */
/* ------------------------------------------------------------------ */

export function useNotes(query?: Partial<NoteListQuery>) {
  const { actor, isFetching } = useBackend();
  const q: NoteListQuery = { ...defaultNoteQuery, ...query };
  return useQuery<NoteListResult>({
    queryKey: ["notes", q],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.listNotes(q);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useNote(id: bigint | undefined) {
  const { actor, isFetching } = useBackend();
  return useQuery<NoteView | null>({
    queryKey: ["note", id?.toString()],
    queryFn: async () => {
      if (!actor || id === undefined) return null;
      return actor.getNote(id);
    },
    enabled: !!actor && !isFetching && id !== undefined,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: NoteInput) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.createNote(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: { id: bigint; update: NoteUpdate }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.updateNote(input.id, input.update);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["note", data.id.toString()] });
    },
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.deleteNote(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useLikeNote() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.likeNote(id);
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["note", id.toString()] });
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Videos                                                             */
/* ------------------------------------------------------------------ */

export function useVideos(filter?: Partial<VideoFilter>) {
  const { actor, isFetching } = useBackend();
  const f: VideoFilter = { ...defaultVideoFilter, ...filter };
  return useQuery<VideoPage>({
    queryKey: ["videos", f],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.listVideos(f);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useVideo(id: VideoId | undefined) {
  const { actor, isFetching } = useBackend();
  return useQuery<Video | null>({
    queryKey: ["video", id?.toString()],
    queryFn: async () => {
      if (!actor || id === undefined) return null;
      return actor.getVideo(id);
    },
    enabled: !!actor && !isFetching && id !== undefined,
  });
}

export function useCreateVideo() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: VideoInput) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.createVideo(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
  });
}

export function useUpdateVideo() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: { id: VideoId; update: VideoUpdate }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.updateVideo(input.id, input.update);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["videos"] });
      if (data) {
        qc.invalidateQueries({ queryKey: ["video", data.id.toString()] });
      }
    },
  });
}

export function useDeleteVideo() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (id: VideoId) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.deleteVideo(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
  });
}

export function useIncrementView() {
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: { id: VideoId; sessionKey: string }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.incrementView(input.id, input.sessionKey);
    },
  });
}

/* ------------------------------------------------------------------ */
/* Discovery: related content & trending                              */
/* ------------------------------------------------------------------ */

export function useRelatedContent(
  contentType: ContentType,
  contentId: bigint | undefined,
  limit: number,
) {
  const { actor, isFetching } = useBackend();
  return useQuery<Recommendation[]>({
    queryKey: ["related-content", contentType, contentId?.toString(), limit],
    queryFn: async () => {
      if (!actor || contentId === undefined) return [];
      return actor.getRelatedContent(contentType, contentId, limit);
    },
    enabled: !!actor && !isFetching && contentId !== undefined,
  });
}

export function useTrending(limit: number) {
  const { actor, isFetching } = useBackend();
  return useQuery<TrendingItem[]>({
    queryKey: ["trending", limit],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.getTrending(limit);
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}

/* ------------------------------------------------------------------ */
/* AI Tutor conversations                                             */
/* ------------------------------------------------------------------ */

export function useConversations() {
  const { actor, isFetching } = useBackend();
  return useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.listConversations();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useMessages(conversationId: bigint | undefined) {
  const { actor, isFetching } = useBackend();
  return useQuery<Message[]>({
    queryKey: ["messages", conversationId?.toString()],
    queryFn: async () => {
      if (!actor || conversationId === undefined) return [];
      return actor.getMessages(conversationId);
    },
    enabled: !!actor && !isFetching && conversationId !== undefined,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: {
      conversationId: bigint;
      userMessage: string;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.sendMessage(input.conversationId, input.userMessage);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: ["messages", input.conversationId.toString()],
      });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (title: string) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.createConversation(title);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (conversationId: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.deleteConversation(conversationId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Dashboards                                                         */
/* ------------------------------------------------------------------ */

export function useCreatorDashboard() {
  const { actor, isFetching } = useBackend();
  return useQuery<CreatorDashboard>({
    queryKey: ["creator-dashboard"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.getCreatorDashboard();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useStudentDashboard() {
  const { actor, isFetching } = useBackend();
  return useQuery<StudentDashboard>({
    queryKey: ["student-dashboard"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.getStudentDashboard();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAdminDashboard() {
  const { actor, isFetching } = useBackend();
  return useQuery<AdminDashboard>({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.getAdminDashboard();
    },
    enabled: !!actor && !isFetching,
  });
}

/* ------------------------------------------------------------------ */
/* Notifications                                                      */
/* ------------------------------------------------------------------ */

export function useNotifications() {
  const { actor, isFetching } = useBackend();
  return useQuery<ListNotificationsResult>({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.listNotifications();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (notificationId: NotificationId) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.markNotificationRead(notificationId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.markAllNotificationsRead();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Admin moderation & user management                                 */
/* ------------------------------------------------------------------ */

export function useApproveContent() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (target: ModerationTarget) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.approveContent(target);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });
}

export function useHideContent() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (target: ModerationTarget) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.hideContent(target);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });
}

export function useDeleteContent() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (target: ModerationTarget) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.deleteContent(target);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["blogs"] });
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.suspendUser(user);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });
}

export function useActivateUser() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.activateUser(user);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });
}

export function useAssignRole() {
  const qc = useQueryClient();
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: { user: Principal; role: UserRole__1 }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.assignRole(input.user, input.role);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });
}

/* Re-export enums so pages can build query objects without importing backend. */
export { BlogSort, ContentType, NoteSort };
