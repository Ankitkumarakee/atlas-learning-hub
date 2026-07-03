import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Video {
    id: VideoId;
    title: string;
    likeCount: bigint;
    isShort: boolean;
    videoBlobId: string;
    thumbnailBlobId: string;
    published: boolean;
    createdAt: bigint;
    description: string;
    author: Principal;
    updatedAt: bigint;
    viewCount: bigint;
    durationSeconds: bigint;
    category: Category;
}
export interface ListBlogsResult {
    total: bigint;
    page: bigint;
    pageSize: bigint;
    items: Array<BlogView>;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export interface BlogView {
    id: BlogId;
    title: string;
    likeCount: bigint;
    content: string;
    published: boolean;
    createdAt: Timestamp;
    tags: Array<string>;
    author: Principal;
    updatedAt: Timestamp;
    viewCount: bigint;
    excerpt: string;
    coverImageBlobId?: Uint8Array;
}
export interface HttpRequestResult {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export interface NoteView {
    id: bigint;
    title: string;
    likeCount: bigint;
    subject: string;
    published: boolean;
    createdAt: bigint;
    description: string;
    fileSize: bigint;
    fileType: NoteFileType;
    author: Principal;
    updatedAt: bigint;
    blobId: string;
    downloadCount: bigint;
}
export interface ListBlogsQuery {
    tag?: string;
    page: bigint;
    sort: BlogSort;
    pageSize: bigint;
    search?: string;
}
export interface NotificationView {
    id: NotificationId;
    content: string;
    source?: SourceContent;
    notificationType: NotificationType;
    createdAt: Timestamp;
    read: boolean;
    recipient: Principal;
}
export interface ContentPerformanceItem {
    id: bigint;
    title: string;
    trend: bigint;
    contentType: ContentType;
    views: bigint;
    likes: bigint;
    comments: bigint;
}
export interface RecentCommentItem {
    contentId: bigint;
    content: string;
    commentId: bigint;
    contentType: ContentType;
    createdAt: Timestamp;
    author: Principal;
    contentTitle: string;
}
export type CommentId = bigint;
export interface SourceContent {
    id: bigint;
    contentType: string;
}
export interface EngagementByType {
    contentType: ContentType;
    bookmarks: bigint;
    likes: bigint;
    comments: bigint;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface CreatorDashboard {
    contentPerformance: Array<ContentPerformanceItem>;
    viewsOverTime: Array<CreatorViewsByTypePoint>;
    recentComments: Array<RecentCommentItem>;
    engagementByType: Array<EngagementByType>;
    totals: CreatorTotals;
}
export interface HttpHeader {
    value: string;
    name: string;
}
export interface AIConversationSummary {
    id: bigint;
    title: string;
    lastMessageAt: Timestamp;
    messageCount: bigint;
}
export type UserId = Principal;
export type Result = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface ListNotificationsResult {
    unreadCount: bigint;
    items: Array<NotificationView>;
}
export type NotificationId = bigint;
export interface CreatorViewsByTypePoint {
    videoViews: bigint;
    date: string;
    noteViews: bigint;
    blogViews: bigint;
}
export interface Conversation {
    id: bigint;
    title: string;
    createdAt: Timestamp;
    user: UserId;
    updatedAt: Timestamp;
}
export interface VideoInput {
    title: string;
    isShort: boolean;
    videoBlobId: string;
    thumbnailBlobId: string;
    published: boolean;
    description: string;
    durationSeconds: bigint;
    category: Category;
}
export type Timestamp = bigint;
export interface VideoFilter {
    isShort?: boolean;
    page?: bigint;
    sort?: VideoSort;
    pageSize?: bigint;
    search?: string;
    category?: Category;
}
export interface VideoPage {
    total: bigint;
    page: bigint;
    pageSize: bigint;
    items: Array<Video>;
}
export interface TrendingItem {
    views: bigint;
    contentRef: {
        id: bigint;
        title: string;
        contentType: ContentType;
        author: Principal;
    };
    likes: bigint;
    score: number;
}
export interface StudentDashboard {
    bookmarks: Array<BookmarkItem>;
    recentAIConversations: Array<AIConversationSummary>;
    totals: StudentTotals;
    learningActivityOverTime: Array<StudentActivityPoint>;
}
export interface SourceReference {
    title: string;
    contentId: bigint;
    sourceType: SourceType;
}
export interface TransformationInput {
    context: Uint8Array;
    response: HttpRequestResult;
}
export type BlogId = bigint;
export type VideoId = bigint;
export interface Recommendation {
    contentRef: {
        id: bigint;
        title: string;
        contentType: ContentType;
        author: Principal;
    };
    score: number;
    reason: string;
}
export interface NoteListQuery {
    subject?: string;
    page: bigint;
    sort?: NoteSort;
    pageSize: bigint;
    search?: string;
    fileType?: NoteFileType;
}
export interface StudentTotals {
    aiConversationsCount: bigint;
    likedContentCount: bigint;
    bookmarksCount: bigint;
}
export interface VideoUpdate {
    title?: string;
    isShort?: boolean;
    thumbnailBlobId?: string;
    published?: boolean;
    description?: string;
    category?: Category;
}
export interface NoteListResult {
    total: bigint;
    page: bigint;
    pageSize: bigint;
    items: Array<NoteView>;
}
export type Category = string;
export interface BookmarkItem {
    content: ContentRef;
    bookmarkedAt: Timestamp;
}
export interface SendMessageResult {
    message: Message;
    sources: Array<SourceReference>;
}
export interface StudentActivityPoint {
    date: string;
    bookmarks: bigint;
    likes: bigint;
    aiSessions: bigint;
}
export interface CommentView {
    id: CommentId;
    likeCount: bigint;
    content: string;
    parentCommentId?: CommentId;
    createdAt: Timestamp;
    author: Principal;
    blogId: BlogId;
}
export interface NoteUpdate {
    title?: string;
    subject?: string;
    published?: boolean;
    description?: string;
    fileSize?: bigint;
    fileType?: NoteFileType;
    blobId?: string;
}
export interface NoteInput {
    title: string;
    subject: string;
    published: boolean;
    description: string;
    fileSize: bigint;
    fileType: NoteFileType;
    blobId: string;
}
export interface CreatorTotals {
    contentCount: bigint;
    totalBookmarks: bigint;
    totalViews: bigint;
    totalLikes: bigint;
}
export interface Message {
    id: bigint;
    content: string;
    createdAt: Timestamp;
    role: MessageRole;
    conversationId: bigint;
    sources: Array<SourceReference>;
}
export interface ContentRef {
    id: bigint;
    title: string;
    contentType: ContentType;
    author: Principal;
}
export enum BlogSort {
    mostBookmarked = "mostBookmarked",
    newest = "newest",
    mostLiked = "mostLiked",
    mostViewed = "mostViewed"
}
export enum ContentType {
    video = "video",
    blog = "blog",
    note = "note"
}
export enum MessageRole {
    user = "user",
    assistant = "assistant"
}
export enum NoteFileType {
    pdf = "pdf",
    ppt = "ppt",
    zip = "zip",
    docx = "docx"
}
export enum NoteSort {
    mostBookmarked = "mostBookmarked",
    mostDownloaded = "mostDownloaded",
    newest = "newest",
    mostLiked = "mostLiked"
}
export enum NotificationType {
    like = "like",
    systemMessage = "systemMessage",
    comment = "comment",
    roleUpgrade = "roleUpgrade",
    moderation = "moderation"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addComment(blogId: BlogId, parentCommentId: CommentId | null, content: string): Promise<CommentView>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    bookmarkBlog(id: BlogId): Promise<void>;
    bookmarkNote(id: bigint): Promise<void>;
    bookmarkVideo(id: VideoId): Promise<boolean>;
    createBlog(title: string, content: string, excerpt: string, tags: Array<string>, coverImageBlobId: Uint8Array | null, published: boolean): Promise<BlogView>;
    createConversation(title: string): Promise<Conversation>;
    createNote(input: NoteInput): Promise<NoteView>;
    createNotification(recipient: Principal, notificationType: NotificationType, content: string, source: SourceContent | null): Promise<void>;
    createVideo(input: VideoInput): Promise<Video>;
    deleteBlog(id: BlogId): Promise<void>;
    deleteComment(id: CommentId): Promise<void>;
    deleteConversation(conversationId: bigint): Promise<boolean>;
    deleteNote(id: bigint): Promise<void>;
    deleteVideo(id: VideoId): Promise<boolean>;
    getBlog(id: BlogId): Promise<BlogView | null>;
    getCallerUserRole(): Promise<UserRole>;
    getComments(blogId: BlogId): Promise<Array<CommentView>>;
    getCreatorDashboard(): Promise<CreatorDashboard>;
    getMessages(conversationId: bigint): Promise<Array<Message>>;
    getNote(id: bigint): Promise<NoteView | null>;
    getRelatedContent(contentType: ContentType, contentId: bigint, limit: bigint): Promise<Array<Recommendation>>;
    getStudentDashboard(): Promise<StudentDashboard>;
    getTrending(limit: bigint): Promise<Array<TrendingItem>>;
    getVideo(id: VideoId): Promise<Video | null>;
    incrementDownload(id: bigint): Promise<void>;
    incrementView(id: VideoId, sessionKey: string): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isVideoBookmarked(id: VideoId): Promise<boolean>;
    isVideoLiked(id: VideoId): Promise<boolean>;
    likeBlog(id: BlogId): Promise<void>;
    likeComment(id: CommentId): Promise<void>;
    likeNote(id: bigint): Promise<void>;
    likeVideo(id: VideoId): Promise<boolean>;
    listBlogs(q: ListBlogsQuery): Promise<ListBlogsResult>;
    listConversations(): Promise<Array<Conversation>>;
    listNotes(q: NoteListQuery): Promise<NoteListResult>;
    listNotifications(): Promise<ListNotificationsResult>;
    listVideos(filter: VideoFilter): Promise<VideoPage>;
    markAllNotificationsRead(): Promise<void>;
    markNotificationRead(notificationId: NotificationId): Promise<void>;
    sendMessage(conversationId: bigint, userMessage: string): Promise<SendMessageResult>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    unbookmarkBlog(id: BlogId): Promise<void>;
    unbookmarkNote(id: bigint): Promise<void>;
    unbookmarkVideo(id: VideoId): Promise<boolean>;
    unlikeBlog(id: BlogId): Promise<void>;
    unlikeNote(id: bigint): Promise<void>;
    unlikeVideo(id: VideoId): Promise<boolean>;
    updateBlog(id: BlogId, title: string, content: string, excerpt: string, tags: Array<string>, coverImageBlobId: Uint8Array | null, published: boolean): Promise<BlogView>;
    updateNote(id: bigint, update: NoteUpdate): Promise<NoteView>;
    updateVideo(id: VideoId, update: VideoUpdate): Promise<Video | null>;
}
