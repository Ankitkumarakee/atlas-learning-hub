import Array "mo:core/Array";
import List "mo:core/List";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Int "mo:core/Int";
import AccessControl "mo:caffeineai-authorization/access-control";
import Types "../types/dashboards";
import DashboardsLib "../lib/dashboards";
import BlogTypes "../types/blogs";
import NoteTypes "../types/notes";
import VideoTypes "../types/videos";
import AITutorTypes "../types/ai-tutor";
import NotificationTypes "../types/notifications";
import Videos "../lib/videos";

// Public API surface for the dashboards domain.
//
// State injected via the mixin parameter (same pattern as blogs/notes/videos):
//   accessControlState  : AccessControl.AccessControlState   -- for role checks + user list
//   blogs               : List.List<BlogTypes.Blog>          -- content source
//   comments            : List.List<BlogTypes.Comment>      -- recent comments feed
//   notes               : List.List<NoteTypes.Note>          -- content source
//   videoStore          : Videos.VideoStore                   -- content source
//   blogBookmarks       : Set.Set<BlogTypes.BlogBookmark>     -- student bookmarks
//   noteBookmarks       : Set.Set<NoteTypes.NoteBookmark>     -- student bookmarks
//   blogLikes            : Set.Set<BlogTypes.BlogLike>        -- student likes
//   noteLikes            : Set.Set<NoteTypes.NoteLike>        -- student likes
//   conversations       : List.List<AITutorTypes.Conversation> -- student AI chats
//   messages            : List.List<AITutorTypes.Message>      -- student AI chats
//   notificationsByUser : Map.Map<Principal, List.List<NotificationTypes.Notification>>
//   nextNotificationId  : { var value : Nat }                  -- notification id counter
//
// Authorization:
//   - getCreatorDashboard requires an authenticated User.
//   - getStudentDashboard requires an authenticated User.
//   - Admin dashboard endpoints have been removed; the platform no longer
//     exposes admin moderation or user-management operations.
mixin (
  accessControlState : AccessControl.AccessControlState,
  blogs : List.List<BlogTypes.Blog>,
  comments : List.List<BlogTypes.Comment>,
  notes : List.List<NoteTypes.Note>,
  videoStore : Videos.VideoStore,
  blogBookmarks : Set.Set<BlogTypes.BlogBookmark>,
  noteBookmarks : Set.Set<NoteTypes.NoteBookmark>,
  blogLikes : Set.Set<BlogTypes.BlogLike>,
  noteLikes : Set.Set<NoteTypes.NoteLike>,
  conversations : List.List<AITutorTypes.Conversation>,
  messages : List.List<AITutorTypes.Message>,
  notificationsByUser : Map.Map<Principal, List.List<NotificationTypes.Notification>>,
  nextNotificationId : { var value : Nat },
) {
  // -------------------------------------------------------------------------
  // Helpers: build snapshots from live stable stores.
  // -------------------------------------------------------------------------

  /// Count how many bookmarks in `set` reference the given content id.
  func countBlogBookmarksFor(id : Nat) : Nat {
    let arr = blogBookmarks.toArray();
    arr.foldLeft(
      0,
      func(acc, b) { if (b.blogId == id) { acc + 1 } else { acc } },
    );
  };

  /// Count how many likes in `set` reference the given blog id.
  func countBlogLikesFor(id : Nat) : Nat {
    let arr = blogLikes.toArray();
    arr.foldLeft(
      0,
      func(acc, l) { if (l.blogId == id) { acc + 1 } else { acc } },
    );
  };

  /// Count how many comments in `comments` belong to the given blog id.
  func countCommentsForBlog(id : Nat) : Nat {
    let arr = comments.toArray();
    arr.foldLeft(
      0,
      func(acc, c) { if (c.blogId == id) { acc + 1 } else { acc } },
    );
  };

  /// Count how many bookmarks in `set` reference the given note id.
  func countNoteBookmarksFor(id : Nat) : Nat {
    let arr = noteBookmarks.toArray();
    arr.foldLeft(
      0,
      func(acc, b) { if (b.noteId == id) { acc + 1 } else { acc } },
    );
  };

  /// Count how many likes in `set` reference the given note id.
  func countNoteLikesFor(id : Nat) : Nat {
    let arr = noteLikes.toArray();
    arr.foldLeft(
      0,
      func(acc, l) { if (l.noteId == id) { acc + 1 } else { acc } },
    );
  };

  /// Count how many bookmarks a video has (across all users).
  func countVideoBookmarksFor(id : VideoTypes.VideoId) : Nat {
    var total = 0;
    for ((_, ids) in videoStore.bookmarks.entries()) {
      if (ids.contains(id)) { total += 1 };
    };
    total;
  };

  /// Count how many likes a video has.
  func countVideoLikesFor(id : VideoTypes.VideoId) : Nat {
    switch (videoStore.likes.get(id)) {
      case null { 0 };
      case (?likers) { likers.size() };
    };
  };

  /// Build the content snapshot aggregating blogs, notes, and videos from
  /// the live stable stores into the read-only shape the lib expects.
  func buildContentSnapshot() : DashboardsLib.ContentSnapshot {
    let blogArr = blogs.toArray();
    let blogSnap = blogArr.map(func(b) {
      {
        id = b.id;
        author = b.author;
        title = b.title;
        createdAt = b.createdAt;
        viewCount = b.viewCount;
        likeCount = b.likeCount;
        commentCount = countCommentsForBlog(b.id);
        bookmarkCount = countBlogBookmarksFor(b.id);
        published = b.published;
      };
    });
    let noteArr = notes.toArray();
    let noteSnap = noteArr.map(func(n) {
      {
        id = n.id;
        author = n.author;
        title = n.title;
        createdAt = n.createdAt;
        downloadCount = n.downloadCount;
        likeCount = n.likeCount;
        bookmarkCount = countNoteBookmarksFor(n.id);
        published = n.published;
      };
    });
    let videoArr = videoStore.videos.toArray();
    let videoSnap = videoArr.map(func(_, v) {
      {
        id = v.id;
        author = v.author;
        title = v.title;
        createdAt = v.createdAt;
        viewCount = v.viewCount;
        likeCount = countVideoLikesFor(v.id);
        bookmarkCount = countVideoBookmarksFor(v.id);
        published = v.published;
      };
    });
    { blogs = blogSnap; notes = noteSnap; videos = videoSnap };
  };

  /// Build the bookmark snapshot for `caller` across blogs, notes, and videos.
  /// Bookmarks/likes don't carry stored timestamps — we use the content's
  /// `createdAt` as a proxy for `bookmarkedAt` so the activity chart can still
  /// bucket by day.
  func buildBookmarkSnapshot(caller : Principal) : DashboardsLib.BookmarkSnapshot {
    let blogArr = blogs.toArray();
    let blogBm = blogArr.filter(func(b) {
      blogBookmarks.contains(BlogTypes.compareBlogBookmark, { blogId = b.id; user = caller });
    }).map(func(b) {
      { id = b.id; title = b.title; author = b.author; bookmarkedAt = b.createdAt };
    });
    let noteArr = notes.toArray();
    let noteBm = noteArr.filter(func(n) {
      noteBookmarks.contains(NoteTypes.compareNoteBookmark, { noteId = n.id; user = caller });
    }).map(func(n) {
      { id = n.id; title = n.title; author = n.author; bookmarkedAt = n.createdAt };
    });
    let videoIds = Videos.bookmarkedIds(videoStore, caller);
    let videoBm = videoIds.map(func(vid) {
      switch (videoStore.videos.get(vid)) {
        case null { { id = vid; title = ""; author = caller; bookmarkedAt = 0 } };
        case (?v) {
          let ts = if (v.createdAt < 0) { 0 } else { Int.abs(v.createdAt) };
          { id = v.id; title = v.title; author = v.author; bookmarkedAt = ts };
        };
      };
    });
    { blogBookmarks = blogBm; noteBookmarks = noteBm; videoBookmarks = videoBm };
  };

  /// Build the like snapshot for `caller` across blogs, notes, and videos.
  /// `likedAt` uses the content's `createdAt` as a proxy timestamp.
  func buildLikeSnapshot(caller : Principal) : DashboardsLib.LikeSnapshot {
    let blogArr = blogs.toArray();
    let blogL = blogArr.filter(func(b) {
      blogLikes.contains(BlogTypes.compareBlogLike, { blogId = b.id; user = caller });
    }).map(func(b) {
      { id = b.id; likedAt = b.createdAt };
    });
    let noteArr = notes.toArray();
    let noteL = noteArr.filter(func(n) {
      noteLikes.contains(NoteTypes.compareNoteLike, { noteId = n.id; user = caller });
    }).map(func(n) {
      { id = n.id; likedAt = n.createdAt };
    });
    let videoIds = Videos.likedIds(videoStore, caller);
    let videoL = videoIds.map(func(vid) {
      switch (videoStore.videos.get(vid)) {
        case null { { id = vid; likedAt = 0 } };
        case (?v) {
          let ts = if (v.createdAt < 0) { 0 } else { Int.abs(v.createdAt) };
          { id = v.id; likedAt = ts };
        };
      };
    });
    { blogLikes = blogL; noteLikes = noteL; videoLikes = videoL };
  };

  /// Build conversation snapshots for `caller` from the AI tutor stores.
  func buildConversationSnapshots(caller : Principal) : [DashboardsLib.ConversationSnapshot] {
    let convArr = conversations.toArray();
    let own = convArr.filter(func(c) { c.user == caller });
    own.map(func(c) {
      // Count messages belonging to this conversation.
      let msgArr = messages.toArray();
      let count = msgArr.foldLeft(
        0,
        func(acc, m) { if (m.conversationId == c.id) { acc + 1 } else { acc } },
      );
      {
        id = c.id;
        title = c.title;
        lastMessageAt = c.updatedAt;
        messageCount = count;
      };
    });
  };

  /// Build comment snapshots across all content. Each comment is mapped to the
  /// blog it belongs to (comments only exist on blogs in this platform).
  func buildCommentSnapshots() : [DashboardsLib.CommentSnapshot] {
    let commentArr = comments.toArray();
    commentArr.map<BlogTypes.Comment, DashboardsLib.CommentSnapshot>(func(c) {
      let title = switch (blogs.find(func(b) { b.id == c.blogId })) {
        case null { "" };
        case (?b) { b.title };
      };
      {
        commentId = c.id;
        contentType = #blog;
        contentId = c.blogId;
        contentTitle = title;
        author = c.author;
        content = c.content;
        createdAt = c.createdAt;
      };
    });
  };

  // -------------------------------------------------------------------------
  // Dashboard read endpoints
  // -------------------------------------------------------------------------

  /// Returns the full creator dashboard for the calling principal.
  /// Requires an authenticated User.
  public shared ({ caller }) func getCreatorDashboard() : async Types.CreatorDashboard {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view the creator dashboard");
    };
    let content = buildContentSnapshot();
    let allComments = buildCommentSnapshots();
    // Filter comments to those left on this creator's content.
    let ownContentIds = content.blogs.foldLeft(
      Set.empty<Nat>(),
      func(acc, b) { if (b.author == caller) { acc.add(b.id); acc } else { acc } },
    );
    let creatorComments = allComments.filter(func(c) {
      // Comments only attach to blogs in this platform.
      ownContentIds.contains(c.contentId);
    });
    DashboardsLib.buildCreatorDashboard(content, caller, creatorComments);
  };

  /// Returns the full student dashboard for the calling principal.
  /// Requires an authenticated User.
  public shared ({ caller }) func getStudentDashboard() : async Types.StudentDashboard {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view the student dashboard");
    };
    let bookmarks = buildBookmarkSnapshot(caller);
    let likes = buildLikeSnapshot(caller);
    let convs = buildConversationSnapshots(caller);
    let likedContentCount = likes.blogLikes.size() + likes.noteLikes.size() + likes.videoLikes.size();
    DashboardsLib.buildStudentDashboard(bookmarks, likes, likedContentCount, convs);
  };
};
