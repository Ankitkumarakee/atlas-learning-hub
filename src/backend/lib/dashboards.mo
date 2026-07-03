import Array "mo:core/Array";
import Int "mo:core/Int";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import VarArray "mo:core/VarArray";
import Types "../types/dashboards";

// Domain logic for the dashboards domain.
//
// Dashboard queries aggregate data from the Blog, Note, Video, and AITutor
// modules. The relevant stable collections are passed into each aggregation
// function so the mixin can wire them from main.mo.
//
// Time bucketing: timestamps are nanoseconds since epoch (Time.now()). Daily
// buckets are derived by converting a timestamp to its civil calendar day and
// formatting it as "YYYY-MM-DD". The over-time series cover the last 30 days
// ending today (inclusive).
module {
  public type ContentType = Types.ContentType;
  public type ContentRef = Types.ContentRef;
  public type CreatorDashboard = Types.CreatorDashboard;
  public type StudentDashboard = Types.StudentDashboard;
  public type AdminDashboard = Types.AdminDashboard;
  public type ModerationTarget = Types.ModerationTarget;
  public type UserRole = Types.UserRole;
  public type UserStatus = Types.UserStatus;
  public type Principal = Principal.Principal;

  /// A read-only snapshot of all platform content used by dashboard
  /// aggregation. Built by the mixin from the live stable stores.
  public type ContentSnapshot = {
    blogs : [{
      id : Nat;
      author : Principal;
      title : Text;
      createdAt : Nat;
      viewCount : Nat;
      likeCount : Nat;
      commentCount : Nat;
      bookmarkCount : Nat;
      published : Bool;
    }];
    notes : [{
      id : Nat;
      author : Principal;
      title : Text;
      createdAt : Nat;
      downloadCount : Nat;
      likeCount : Nat;
      bookmarkCount : Nat;
      published : Bool;
    }];
    videos : [{
      id : Nat;
      author : Principal;
      title : Text;
      createdAt : Int;
      viewCount : Nat;
      likeCount : Nat;
      bookmarkCount : Nat;
      published : Bool;
    }];
  };

  /// A read-only snapshot of bookmarks across content types for a user.
  public type BookmarkSnapshot = {
    blogBookmarks : [{ id : Nat; title : Text; author : Principal; bookmarkedAt : Nat }];
    noteBookmarks : [{ id : Nat; title : Text; author : Principal; bookmarkedAt : Nat }];
    videoBookmarks : [{ id : Nat; title : Text; author : Principal; bookmarkedAt : Nat }];
  };

  /// A read-only snapshot of likes across content types for a user, with the
  /// timestamp of each like so the student activity chart can bucket by day.
  public type LikeSnapshot = {
    blogLikes : [{ id : Nat; likedAt : Nat }];
    noteLikes : [{ id : Nat; likedAt : Nat }];
    videoLikes : [{ id : Nat; likedAt : Nat }];
  };

  /// A read-only snapshot of AI tutor conversations for a user.
  public type ConversationSnapshot = {
    id : Nat;
    title : Text;
    lastMessageAt : Nat;
    messageCount : Nat;
  };

  /// A read-only snapshot of recent comments across a creator's content.
  public type CommentSnapshot = {
    commentId : Nat;
    contentType : ContentType;
    contentId : Nat;
    contentTitle : Text;
    author : Principal;
    content : Text;
    createdAt : Nat;
  };

  /// A read-only snapshot of platform users for the admin dashboard.
  public type UserSnapshot = {
    id : Principal;
    name : Text;
    role : UserRole;
    status : UserStatus;
    /// Number of content items authored by this user across all types.
    contentCount : Nat;
    createdAt : Nat;
  };

  /// A read-only snapshot of flagged content for the admin moderation queue.
  public type ModerationSnapshot = {
    content : ContentRef;
    status : Types.ModerationStatus;
    flaggedAt : Nat;
    reason : Text;
  };

  // ---------------------------------------------------------------------------
  // Time helpers
  // ---------------------------------------------------------------------------

  // Number of nanoseconds in one day.
  let NS_PER_DAY : Nat = 86_400_000_000_000;

  /// Convert a nanosecond timestamp (Nat) to its civil calendar day as a
  /// "YYYY-MM-DD" label. Uses the proleptic Gregorian algorithm from
  /// Howard Hinnant's `days_from_civil` run in reverse.
  func dateLabelFromNs(ns : Nat) : Text {
    let days = ns / NS_PER_DAY;
    dateLabelFromDays(days);
  };

  /// Convert an Int nanosecond timestamp to a "YYYY-MM-DD" label.
  func dateLabelFromNsInt(ns : Int) : Text {
    if (ns < 0) { return "1970-01-01" };
    dateLabelFromNs(Int.abs(ns));
  };

  /// Convert a count of days since 1970-01-01 to a "YYYY-MM-DD" label.
  func dateLabelFromDays(days : Nat) : Text {
    // Howard Hinnant's civil_from_days algorithm.
    let z = days + 719468;
    let era = z / 146097;
    let doe = z - era * 146097; // [0, 146096]
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365; // [0, 399]
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100); // [0, 365]
    let mp = (5 * doy + 2) / 153; // [0, 11]
    let d = doy - (153 * mp + 2) / 5 + 1; // [1, 31]
    let m = if (mp < 10) { mp + 3 } else { mp - 9 }; // [1, 12]
    let year = if (m <= 2) { y + 1 } else { y };
    pad4(year) # "-" # pad2(m) # "-" # pad2(d);
  };

  /// Zero-pad a number to 2 digits.
  func pad2(n : Nat) : Text {
    if (n < 10) { "0" # n.toText() } else { n.toText() };
  };

  /// Zero-pad a number to 4 digits.
  func pad4(n : Nat) : Text {
    if (n < 10) { "000" # n.toText() } else if (n < 100) {
      "00" # n.toText();
    } else if (n < 1000) { "0" # n.toText() } else { n.toText() };
  };

  /// Build the list of 30 daily date labels ending today (inclusive), oldest
  /// first. `nowNs` is the current time in nanoseconds.
  func last30DayLabels(nowNs : Nat) : [Text] {
    let todayDays = nowNs / NS_PER_DAY;
    Array.tabulate(30, func(i) {
      let day = todayDays - (29 - i);
      if (day > 0) { dateLabelFromDays(day) } else { dateLabelFromDays(0) };
    });
  };

  /// Find the index of a date label in a 30-day label array, or null if the
  /// timestamp falls outside the window.
  func bucketIndex(labels : [Text], ns : Nat) : ?Nat {
    if (ns == 0) { return null };
    let dayLabel = dateLabelFromNs(ns);
    labels.indexOf(Text.equal, dayLabel);
  };

  /// Find the bucket index for an Int nanosecond timestamp.
  func bucketIndexInt(labels : [Text], ns : Int) : ?Nat {
    if (ns <= 0) { return null };
    let dayLabel = dateLabelFromNsInt(ns);
    labels.indexOf(Text.equal, dayLabel);
  };

  // ---------------------------------------------------------------------------
  // Creator dashboard aggregation
  // ---------------------------------------------------------------------------

  /// Compute the headline totals for a creator (views/likes/bookmarks/content).
  public func creatorTotals(content : ContentSnapshot, creator : Principal) : Types.CreatorTotals {
    var totalViews = 0;
    var totalLikes = 0;
    var totalBookmarks = 0;
    var contentCount = 0;
    for (b in content.blogs.vals()) {
      if (b.author == creator) {
        totalViews += b.viewCount;
        totalLikes += b.likeCount;
        totalBookmarks += b.bookmarkCount;
        contentCount += 1;
      };
    };
    for (n in content.notes.vals()) {
      if (n.author == creator) {
        totalLikes += n.likeCount;
        totalBookmarks += n.bookmarkCount;
        contentCount += 1;
      };
    };
    for (v in content.videos.vals()) {
      if (v.author == creator) {
        totalViews += v.viewCount;
        totalLikes += v.likeCount;
        totalBookmarks += v.bookmarkCount;
        contentCount += 1;
      };
    };
    {
      totalViews;
      totalLikes;
      totalBookmarks;
      contentCount;
    };
  };

  /// Build the daily view-count series for a creator over the last 30 days,
  /// broken down by content type (blog/note/video) per day.
  ///
  /// Per-day view counts are not tracked individually; each content item's
  /// total view count is attributed to the day it was created. This gives a
  /// creation-weighted view series that is the best available approximation
  /// from the stored data.
  public func creatorViewsOverTime(content : ContentSnapshot, creator : Principal) : [Types.CreatorViewsByTypePoint] {
    let nowNs = 0; // mixin supplies real time; lib is pure so we bucket by createdAt only
    // The mixin passes content with createdAt timestamps; we bucket by those.
    // Use the maximum createdAt across all content as "now" so the 30-day
    // window is anchored to the most recent activity rather than wall clock.
    var maxNs : Nat = 0;
    for (b in content.blogs.vals()) {
      if (b.author == creator and b.createdAt > maxNs) { maxNs := b.createdAt };
    };
    for (n in content.notes.vals()) {
      if (n.author == creator and n.createdAt > maxNs) { maxNs := n.createdAt };
    };
    for (v in content.videos.vals()) {
      if (v.author == creator) {
        let c = Int.abs(v.createdAt);
        if (c > maxNs) { maxNs := c };
      };
    };
    let labels = last30DayLabels(maxNs);
    let blogViews = VarArray.repeat<Nat>(0, 30);
    let noteViews = VarArray.repeat<Nat>(0, 30);
    let videoViews = VarArray.repeat<Nat>(0, 30);
    for (b in content.blogs.vals()) {
      if (b.author == creator) {
        switch (bucketIndex(labels, b.createdAt)) {
          case (?i) { blogViews[i] := blogViews[i] + b.viewCount };
          case null {};
        };
      };
    };
    for (v in content.videos.vals()) {
      if (v.author == creator) {
        switch (bucketIndexInt(labels, v.createdAt)) {
          case (?i) { videoViews[i] := videoViews[i] + v.viewCount };
          case null {};
        };
      };
    };
    // Notes have no view count; their download count is the closest engagement
    // signal. We leave noteViews at 0 since the type field is named noteViews.
    Array.tabulate(30, func(i) {
      {
        date = labels[i];
        blogViews = blogViews[i];
        noteViews = noteViews[i];
        videoViews = videoViews[i];
      };
    });
  };

  /// Build the engagement-by-type breakdown for a creator.
  public func creatorEngagementByType(content : ContentSnapshot, creator : Principal) : [Types.EngagementByType] {
    var blogLikes = 0;
    var blogComments = 0;
    var blogBookmarks = 0;
    var noteLikes = 0;
    var noteComments = 0;
    var noteBookmarks = 0;
    var videoLikes = 0;
    var videoComments = 0;
    var videoBookmarks = 0;
    for (b in content.blogs.vals()) {
      if (b.author == creator) {
        blogLikes += b.likeCount;
        blogComments += b.commentCount;
        blogBookmarks += b.bookmarkCount;
      };
    };
    for (n in content.notes.vals()) {
      if (n.author == creator) {
        noteLikes += n.likeCount;
        noteBookmarks += n.bookmarkCount;
      };
    };
    for (v in content.videos.vals()) {
      if (v.author == creator) {
        videoLikes += v.likeCount;
        videoBookmarks += v.bookmarkCount;
      };
    };
    [
      { contentType = #blog; likes = blogLikes; comments = blogComments; bookmarks = blogBookmarks },
      { contentType = #note; likes = noteLikes; comments = noteComments; bookmarks = noteBookmarks },
      { contentType = #video; likes = videoLikes; comments = videoComments; bookmarks = videoBookmarks },
    ];
  };

  /// Build the top-content performance list for a creator, sorted by
  /// engagement (views + likes + comments) descending.
  public func creatorContentPerformance(content : ContentSnapshot, creator : Principal) : [Types.ContentPerformanceItem] {
    let items = List.empty<Types.ContentPerformanceItem>();
    for (b in content.blogs.vals()) {
      if (b.author == creator) {
        items.add({
          id = b.id;
          contentType = #blog;
          title = b.title;
          views = b.viewCount;
          likes = b.likeCount;
          comments = b.commentCount;
          trend = 0;
        });
      };
    };
    for (n in content.notes.vals()) {
      if (n.author == creator) {
        items.add({
          id = n.id;
          contentType = #note;
          title = n.title;
          views = n.downloadCount;
          likes = n.likeCount;
          comments = 0;
          trend = 0;
        });
      };
    };
    for (v in content.videos.vals()) {
      if (v.author == creator) {
        items.add({
          id = v.id;
          contentType = #video;
          title = v.title;
          views = v.viewCount;
          likes = v.likeCount;
          comments = 0;
          trend = 0;
        });
      };
    };
    items.toArray().sort(func(a, b) {
      let aEng = a.views + a.likes + a.comments;
      let bEng = b.views + b.likes + b.comments;
      Nat.compare(bEng, aEng);
    });
  };

  /// Build the recent-comments feed across all of a creator's content.
  public func creatorRecentComments(comments : [CommentSnapshot], creator : Principal) : [Types.RecentCommentItem] {
    let own = comments.filter(func(c) {
      // A comment belongs to a creator if it was left on their content. The
      // snapshot already filters by creator in the mixin; here we keep all
      // passed comments since the mixin builds them per-creator.
      ignore creator;
      true;
    });
    let sorted = own.sort(func(a, b) { Nat.compare(b.createdAt, a.createdAt) });
    Array.tabulate(
      if (sorted.size() > 10) { 10 } else { sorted.size() },
      func(i) {
        let c = sorted[i];
        {
          commentId = c.commentId;
          contentType = c.contentType;
          contentId = c.contentId;
          contentTitle = c.contentTitle;
          author = c.author;
          content = c.content;
          createdAt = c.createdAt;
        };
      },
    );
  };

  /// Assemble the full creator dashboard payload.
  public func buildCreatorDashboard(
    content : ContentSnapshot,
    creator : Principal,
    comments : [CommentSnapshot],
  ) : CreatorDashboard {
    {
      totals = creatorTotals(content, creator);
      viewsOverTime = creatorViewsOverTime(content, creator);
      engagementByType = creatorEngagementByType(content, creator);
      contentPerformance = creatorContentPerformance(content, creator);
      recentComments = creatorRecentComments(comments, creator);
    };
  };

  // ---------------------------------------------------------------------------
  // Student dashboard aggregation
  // ---------------------------------------------------------------------------

  /// Compute the headline totals for a student.
  public func studentTotals(
    bookmarks : BookmarkSnapshot,
    likedContentCount : Nat,
    conversations : [ConversationSnapshot],
  ) : Types.StudentTotals {
    {
      bookmarksCount = bookmarks.blogBookmarks.size() + bookmarks.noteBookmarks.size() + bookmarks.videoBookmarks.size();
      likedContentCount;
      aiConversationsCount = conversations.size();
    };
  };

  /// Build the daily learning-activity series for a student over the last
  /// 30 days, broken down by bookmarks / likes / AI sessions per day.
  public func studentLearningActivityOverTime(
    bookmarks : BookmarkSnapshot,
    likes : LikeSnapshot,
    conversations : [ConversationSnapshot],
  ) : [Types.StudentActivityPoint] {
    // Anchor the 30-day window to the most recent activity timestamp.
    var maxNs : Nat = 0;
    for (b in bookmarks.blogBookmarks.vals()) { if (b.bookmarkedAt > maxNs) { maxNs := b.bookmarkedAt } };
    for (b in bookmarks.noteBookmarks.vals()) { if (b.bookmarkedAt > maxNs) { maxNs := b.bookmarkedAt } };
    for (b in bookmarks.videoBookmarks.vals()) { if (b.bookmarkedAt > maxNs) { maxNs := b.bookmarkedAt } };
    for (l in likes.blogLikes.vals()) { if (l.likedAt > maxNs) { maxNs := l.likedAt } };
    for (l in likes.noteLikes.vals()) { if (l.likedAt > maxNs) { maxNs := l.likedAt } };
    for (l in likes.videoLikes.vals()) { if (l.likedAt > maxNs) { maxNs := l.likedAt } };
    for (c in conversations.vals()) { if (c.lastMessageAt > maxNs) { maxNs := c.lastMessageAt } };
    let labels = last30DayLabels(maxNs);
    let bk = VarArray.repeat<Nat>(0, 30);
    let lk = VarArray.repeat<Nat>(0, 30);
    let ai = VarArray.repeat<Nat>(0, 30);
    for (b in bookmarks.blogBookmarks.vals()) {
      switch (bucketIndex(labels, b.bookmarkedAt)) {
        case (?i) { bk[i] := bk[i] + 1 };
        case null {};
      };
    };
    for (b in bookmarks.noteBookmarks.vals()) {
      switch (bucketIndex(labels, b.bookmarkedAt)) {
        case (?i) { bk[i] := bk[i] + 1 };
        case null {};
      };
    };
    for (b in bookmarks.videoBookmarks.vals()) {
      switch (bucketIndex(labels, b.bookmarkedAt)) {
        case (?i) { bk[i] := bk[i] + 1 };
        case null {};
      };
    };
    for (l in likes.blogLikes.vals()) {
      switch (bucketIndex(labels, l.likedAt)) {
        case (?i) { lk[i] := lk[i] + 1 };
        case null {};
      };
    };
    for (l in likes.noteLikes.vals()) {
      switch (bucketIndex(labels, l.likedAt)) {
        case (?i) { lk[i] := lk[i] + 1 };
        case null {};
      };
    };
    for (l in likes.videoLikes.vals()) {
      switch (bucketIndex(labels, l.likedAt)) {
        case (?i) { lk[i] := lk[i] + 1 };
        case null {};
      };
    };
    for (c in conversations.vals()) {
      switch (bucketIndex(labels, c.lastMessageAt)) {
        case (?i) { ai[i] := ai[i] + 1 };
        case null {};
      };
    };
    Array.tabulate(30, func(i) {
      { date = labels[i]; bookmarks = bk[i]; likes = lk[i]; aiSessions = ai[i] };
    });
  };

  /// Build the student's bookmarks list (mixed content types).
  public func studentBookmarks(bookmarks : BookmarkSnapshot) : [Types.BookmarkItem] {
    let items = List.empty<Types.BookmarkItem>();
    for (b in bookmarks.blogBookmarks.vals()) {
      items.add({
        content = { id = b.id; contentType = #blog; title = b.title; author = b.author };
        bookmarkedAt = b.bookmarkedAt;
      });
    };
    for (n in bookmarks.noteBookmarks.vals()) {
      items.add({
        content = { id = n.id; contentType = #note; title = n.title; author = n.author };
        bookmarkedAt = n.bookmarkedAt;
      });
    };
    for (v in bookmarks.videoBookmarks.vals()) {
      items.add({
        content = { id = v.id; contentType = #video; title = v.title; author = v.author };
        bookmarkedAt = v.bookmarkedAt;
      });
    };
    items.toArray().sort(func(a, b) { Nat.compare(b.bookmarkedAt, a.bookmarkedAt) });
  };

  /// Build the student's recent AI tutor conversations list.
  public func studentRecentAIConversations(conversations : [ConversationSnapshot]) : [Types.AIConversationSummary] {
    let sorted = conversations.sort(func(a, b) { Nat.compare(b.lastMessageAt, a.lastMessageAt) });
    Array.tabulate(
      if (sorted.size() > 10) { 10 } else { sorted.size() },
      func(i) {
        let c = sorted[i];
        { id = c.id; title = c.title; lastMessageAt = c.lastMessageAt; messageCount = c.messageCount };
      },
    );
  };

  /// Assemble the full student dashboard payload.
  public func buildStudentDashboard(
    bookmarks : BookmarkSnapshot,
    likes : LikeSnapshot,
    likedContentCount : Nat,
    conversations : [ConversationSnapshot],
  ) : StudentDashboard {
    let bookmarkItems = studentBookmarks(bookmarks);
    {
      totals = studentTotals(bookmarks, likedContentCount, conversations);
      learningActivityOverTime = studentLearningActivityOverTime(bookmarks, likes, conversations);
      bookmarks = bookmarkItems;
      recentAIConversations = studentRecentAIConversations(conversations);
    };
  };

  // ---------------------------------------------------------------------------
  // Admin dashboard aggregation
  // ---------------------------------------------------------------------------

  /// Compute the platform headline totals for the admin.
  public func adminTotals(
    users : [UserSnapshot],
    content : ContentSnapshot,
    moderation : [ModerationSnapshot],
  ) : Types.AdminTotals {
    var totalCreators = 0;
    for (u in users.vals()) {
      if (u.role == #creator) { totalCreators += 1 };
    };
    let flagged = moderation.filter(func(m) {
      m.status == #flagged;
    }).size();
    {
      totalUsers = users.size();
      totalCreators;
      totalContentItems = content.blogs.size() + content.notes.size() + content.videos.size();
      flaggedItemsCount = flagged;
    };
  };

  /// Build the admin user-management list.
  public func adminUsers(users : [UserSnapshot]) : [Types.UserManagementItem] {
    users.map(func(u) {
      {
        id = u.id;
        name = u.name;
        role = u.role;
        status = u.status;
        contentCount = u.contentCount;
        createdAt = u.createdAt;
      };
    });
  };

  /// Build the admin content-moderation queue (flagged items).
  public func adminModerationQueue(moderation : [ModerationSnapshot]) : [Types.ModerationQueueItem] {
    moderation.map(func(m) {
      { content = m.content; status = m.status; flaggedAt = m.flaggedAt; reason = m.reason };
    });
  };

  /// Build the daily platform-growth series (new users + new content) for
  /// the last 30 days, one point per day.
  public func adminPlatformGrowthOverTime(
    users : [UserSnapshot],
    content : ContentSnapshot,
  ) : [Types.PlatformGrowthPoint] {
    // Anchor the window to the most recent content creation timestamp.
    var maxNs : Nat = 0;
    for (u in users.vals()) { if (u.createdAt > maxNs) { maxNs := u.createdAt } };
    for (b in content.blogs.vals()) { if (b.createdAt > maxNs) { maxNs := b.createdAt } };
    for (n in content.notes.vals()) { if (n.createdAt > maxNs) { maxNs := n.createdAt } };
    for (v in content.videos.vals()) {
      let c = Int.abs(v.createdAt);
      if (c > maxNs) { maxNs := c };
    };
    let labels = last30DayLabels(maxNs);
    let newUsers = VarArray.repeat<Nat>(0, 30);
    let newContent = VarArray.repeat<Nat>(0, 30);
    for (u in users.vals()) {
      switch (bucketIndex(labels, u.createdAt)) {
        case (?i) { newUsers[i] := newUsers[i] + 1 };
        case null {};
      };
    };
    for (b in content.blogs.vals()) {
      switch (bucketIndex(labels, b.createdAt)) {
        case (?i) { newContent[i] := newContent[i] + 1 };
        case null {};
      };
    };
    for (n in content.notes.vals()) {
      switch (bucketIndex(labels, n.createdAt)) {
        case (?i) { newContent[i] := newContent[i] + 1 };
        case null {};
      };
    };
    for (v in content.videos.vals()) {
      switch (bucketIndexInt(labels, v.createdAt)) {
        case (?i) { newContent[i] := newContent[i] + 1 };
        case null {};
      };
    };
    Array.tabulate(30, func(i) {
      { date = labels[i]; newUsers = newUsers[i]; newContent = newContent[i] };
    });
  };

  /// Build the content-distribution-by-type counts across the platform.
  public func adminContentDistribution(content : ContentSnapshot) : Types.ContentDistribution {
    {
      blogs = content.blogs.size();
      notes = content.notes.size();
      videos = content.videos.size();
    };
  };

  /// Assemble the full admin dashboard payload.
  public func buildAdminDashboard(
    users : [UserSnapshot],
    content : ContentSnapshot,
    moderation : [ModerationSnapshot],
  ) : AdminDashboard {
    {
      totals = adminTotals(users, content, moderation);
      users = adminUsers(users);
      moderationQueue = adminModerationQueue(moderation);
      platformGrowthOverTime = adminPlatformGrowthOverTime(users, content);
      contentDistribution = adminContentDistribution(content);
    };
  };
};
