module {
  /// Cross-cutting timestamp type (nanoseconds since epoch, matching Time.now()).
  public type Timestamp = Nat;

  /// A single day bucket used by over-time chart series.
  /// `date` is the day label (e.g. "2026-07-03"); `count` is the aggregated
  /// value for that day.
  public type DatePoint = {
    date : Text; // day label, e.g. "2026-07-03"
    count : Nat;
  };

  /// Content type discriminator shared across dashboards (blogs/notes/videos).
  public type ContentType = {
    #blog;
    #note;
    #video;
  };

  /// A reference to a piece of content of any supported type, used by the
  /// student bookmarks list and the admin moderation queue.
  public type ContentRef = {
    id : Nat;
    contentType : ContentType;
    title : Text;
    author : Principal;
  };

  // ---------------------------------------------------------------------------
  // Creator dashboard
  // ---------------------------------------------------------------------------

  /// Headline totals for a single creator.
  public type CreatorTotals = {
    totalViews : Nat;
    totalLikes : Nat;
    totalBookmarks : Nat;
    contentCount : Nat;
  };

  /// Engagement breakdown for one content type within the creator dashboard.
  public type EngagementByType = {
    contentType : ContentType;
    likes : Nat;
    comments : Nat;
    bookmarks : Nat;
  };

  /// Per-day view counts broken down by content type for the creator views
  /// chart. Each day carries blog/note/video counts so the chart can stack
  /// or filter by type.
  public type CreatorViewsByTypePoint = {
    date : Text;
    blogViews : Nat;
    noteViews : Nat;
    videoViews : Nat;
  };

  /// A top-performing content item for the creator, with engagement metrics
  /// and a trend indicator.
  public type ContentPerformanceItem = {
    id : Nat;
    contentType : ContentType;
    title : Text;
    views : Nat;
    likes : Nat;
    comments : Nat;
    /// Trend vs the previous comparable period: positive = up, zero = flat,
    /// negative = down.
    trend : Int;
  };

  /// A recent comment left on any of the creator's content, with a deep link
  /// back to the source content.
  public type RecentCommentItem = {
    commentId : Nat;
    contentType : ContentType;
    contentId : Nat;
    contentTitle : Text;
    author : Principal;
    content : Text;
    createdAt : Timestamp;
  };

  /// Full creator dashboard payload returned by getCreatorDashboard.
  public type CreatorDashboard = {
    totals : CreatorTotals;
    /// Daily view counts for the last 30 days, broken down by content type.
    viewsOverTime : [CreatorViewsByTypePoint];
    /// Engagement split by content type (one entry per type).
    engagementByType : [EngagementByType];
    /// Top content items ordered by engagement (descending).
    contentPerformance : [ContentPerformanceItem];
    /// Recent comments across all of the creator's content.
    recentComments : [RecentCommentItem];
  };

  // ---------------------------------------------------------------------------
  // Student dashboard
  // ---------------------------------------------------------------------------

  /// Headline totals for a single student.
  public type StudentTotals = {
    bookmarksCount : Nat;
    likedContentCount : Nat;
    aiConversationsCount : Nat;
  };

  /// A bookmark entry with enough info for a quick-open list row.
  public type BookmarkItem = {
    content : ContentRef;
    bookmarkedAt : Timestamp;
  };

  /// A recent AI tutor conversation summary for the student dashboard.
  public type AIConversationSummary = {
    id : Nat;
    title : Text;
    lastMessageAt : Timestamp;
    messageCount : Nat;
  };

  /// Per-day learning activity for the student, broken down by interaction
  /// kind (bookmarks / likes / AI sessions) so the chart can stack or filter.
  public type StudentActivityPoint = {
    date : Text;
    bookmarks : Nat;
    likes : Nat;
    aiSessions : Nat;
  };

  /// Full student dashboard payload returned by getStudentDashboard.
  public type StudentDashboard = {
    totals : StudentTotals;
    /// Daily interaction counts for the last 30 days, broken down by kind.
    learningActivityOverTime : [StudentActivityPoint];
    /// The student's bookmarks (mixed content types).
    bookmarks : [BookmarkItem];
    /// Most recent AI tutor conversations.
    recentAIConversations : [AIConversationSummary];
  };

  // ---------------------------------------------------------------------------
  // Admin dashboard
  // ---------------------------------------------------------------------------

  /// Headline totals for the platform admin.
  public type AdminTotals = {
    totalUsers : Nat;
    totalCreators : Nat;
    totalContentItems : Nat;
    flaggedItemsCount : Nat;
  };

  /// User role used by the admin user-management list and assignRole.
  public type UserRole = {
    #user;
    #creator;
    #admin;
  };

  /// Account status used by the admin user-management list and suspend/activate.
  public type UserStatus = {
    #active;
    #suspended;
  };

  /// A row in the admin user-management list.
  public type UserManagementItem = {
    id : Principal;
    name : Text;
    role : UserRole;
    status : UserStatus;
    /// Number of content items authored by this user across all types.
    contentCount : Nat;
    createdAt : Timestamp;
  };

  /// Moderation status of a flagged content item in the admin queue.
  public type ModerationStatus = {
    #flagged;
    #approved;
    #hidden;
  };

  /// A row in the admin content-moderation queue.
  public type ModerationQueueItem = {
    content : ContentRef;
    status : ModerationStatus;
    flaggedAt : Timestamp;
    /// Reason text supplied when the item was flagged.
    reason : Text;
  };

  /// Daily platform growth: new users and new content per day.
  public type PlatformGrowthPoint = {
    date : Text;
    newUsers : Nat;
    newContent : Nat;
  };

  /// Content distribution counts by type across the whole platform.
  public type ContentDistribution = {
    blogs : Nat;
    notes : Nat;
    videos : Nat;
  };

  /// Full admin dashboard payload returned by getAdminDashboard.
  public type AdminDashboard = {
    totals : AdminTotals;
    /// User management list (paginated externally if needed).
    users : [UserManagementItem];
    /// Content moderation queue (flagged items awaiting action).
    moderationQueue : [ModerationQueueItem];
    /// Daily new-users + new-content for the last 30 days.
    platformGrowthOverTime : [PlatformGrowthPoint];
    /// Counts of each content type across the platform.
    contentDistribution : ContentDistribution;
  };

  // ---------------------------------------------------------------------------
  // Moderation action inputs
  // ---------------------------------------------------------------------------

  /// Identifies a piece of content to moderate (used by approve/hide/delete).
  public type ModerationTarget = {
    id : Nat;
    contentType : ContentType;
  };
};
