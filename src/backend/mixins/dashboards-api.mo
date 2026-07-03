import Array "mo:core/Array";
import List "mo:core/List";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
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
import NotificationsLib "../lib/notifications";

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
//   - getAdminDashboard requires the Admin role.
//   - The admin moderation methods require the Admin role.
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

  /// Build user snapshots from the AccessControl userRoles map. AccessControl
  /// has no name/createdAt fields, so we use principal.toText() for name and
  /// 0 for createdAt. Status is derived: #guest role = #suspended, else
  /// #active. Content counts are computed across blogs/notes/videos.
  func buildUserSnapshots() : [DashboardsLib.UserSnapshot] {
    let rolesArr = accessControlState.userRoles.toArray();
    rolesArr.map(func((id, role)) {
      // Count content authored by this user across all stores.
      var contentCount = 0;
      let blogArr = blogs.toArray();
      contentCount += blogArr.foldLeft(
        0,
        func(acc, b) { if (b.author == id) { acc + 1 } else { acc } },
      );
      let noteArr = notes.toArray();
      contentCount += noteArr.foldLeft(
        0,
        func(acc, n) { if (n.author == id) { acc + 1 } else { acc } },
      );
      for ((_, v) in videoStore.videos.entries()) {
        if (v.author == id) { contentCount += 1 };
      };
      // Map AccessControl role to dashboards UserRole.
      let dashboardsRole : Types.UserRole = switch (role) {
        case (#admin) { #admin };
        case (#user) { #user };
        case (#guest) { #user };
      };
      // #guest role maps to suspended status; everything else is active.
      let status : Types.UserStatus = if (role == #guest) { #suspended } else { #active };
      {
        id;
        name = id.toText();
        role = dashboardsRole;
        status;
        contentCount;
        createdAt = 0;
      };
    });
  };

  /// Build moderation snapshots. Unpublished content is treated as pending
  /// moderation (#flagged). Published content is considered approved and is
  /// excluded from the queue (the admin dashboard filters to #flagged only).
  func buildModerationSnapshots() : [DashboardsLib.ModerationSnapshot] {
    var items : [DashboardsLib.ModerationSnapshot] = [];
    let blogArr = blogs.toArray();
    for (b in blogArr.vals()) {
      if (not b.published) {
        items := items.concat([{
          content = {
            id = b.id;
            contentType = #blog;
            title = b.title;
            author = b.author;
          };
          status = #flagged;
          flaggedAt = b.createdAt;
          reason = "Unpublished blog awaiting review";
        }]);
      };
    };
    let noteArr = notes.toArray();
    for (n in noteArr.vals()) {
      if (not n.published) {
        items := items.concat([{
          content = {
            id = n.id;
            contentType = #note;
            title = n.title;
            author = n.author;
          };
          status = #flagged;
          flaggedAt = n.createdAt;
          reason = "Unpublished note awaiting review";
        }]);
      };
    };
    for ((_, v) in videoStore.videos.entries()) {
      if (not v.published) {
        let ts = if (v.createdAt < 0) { 0 } else { Int.abs(v.createdAt) };
        items := items.concat([{
          content = {
            id = v.id;
            contentType = #video;
            title = v.title;
            author = v.author;
          };
          status = #flagged;
          flaggedAt = ts;
          reason = "Unpublished video awaiting review";
        }]);
      };
    };
    items;
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

  /// Returns the full admin dashboard for the platform.
  /// Requires the Admin role.
  public shared ({ caller }) func getAdminDashboard() : async Types.AdminDashboard {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view the admin dashboard");
    };
    let users = buildUserSnapshots();
    let content = buildContentSnapshot();
    let moderation = buildModerationSnapshots();
    DashboardsLib.buildAdminDashboard(users, content, moderation);
  };

  // -------------------------------------------------------------------------
  // Admin moderation endpoints
  // -------------------------------------------------------------------------

  /// Approve a flagged content item (blog/note/video). Requires Admin role.
  /// Sets `published = true` on the target and notifies the author.
  public shared ({ caller }) func approveContent(target : Types.ModerationTarget) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can approve content");
    };
    let now = Int.abs(Time.now());
    let contentTypeText = switch (target.contentType) {
      case (#blog) { "blog" };
      case (#note) { "note" };
      case (#video) { "video" };
    };
    switch (target.contentType) {
      case (#blog) {
        switch (blogs.find(func(b) { b.id == target.id })) {
          case null { Runtime.trap("Blog not found") };
          case (?blog) {
            blogs.mapInPlace(func(b) {
              if (b.id == target.id) {
                {
                  id = b.id;
                  author = b.author;
                  title = b.title;
                  content = b.content;
                  excerpt = b.excerpt;
                  tags = b.tags;
                  coverImageBlobId = b.coverImageBlobId;
                  createdAt = b.createdAt;
                  updatedAt = b.updatedAt;
                  published = true;
                  var viewCount = b.viewCount;
                  var likeCount = b.likeCount;
                };
              } else { b };
            });
            NotificationsLib.addNotification(
              notificationsByUser,
              nextNotificationId,
              blog.author,
              #moderation,
              "Your blog \"" # blog.title # "\" was approved",
              ?{ id = target.id; contentType = contentTypeText },
              now,
            );
          };
        };
      };
      case (#note) {
        switch (notes.find(func(n) { n.id == target.id })) {
          case null { Runtime.trap("Note not found") };
          case (?note) {
            notes.mapInPlace(func(n) {
              if (n.id == target.id) {
                {
                  id = n.id;
                  author = n.author;
                  title = n.title;
                  description = n.description;
                  subject = n.subject;
                  fileType = n.fileType;
                  blobId = n.blobId;
                  fileSize = n.fileSize;
                  var downloadCount = n.downloadCount;
                  var likeCount = n.likeCount;
                  published = true;
                  createdAt = n.createdAt;
                  updatedAt = n.updatedAt;
                };
              } else { n };
            });
            NotificationsLib.addNotification(
              notificationsByUser,
              nextNotificationId,
              note.author,
              #moderation,
              "Your note \"" # note.title # "\" was approved",
              ?{ id = target.id; contentType = contentTypeText },
              now,
            );
          };
        };
      };
      case (#video) {
        switch (videoStore.videos.get(target.id)) {
          case null { Runtime.trap("Video not found") };
          case (?video) {
            videoStore.videos.add(target.id, { video with published = true });
            NotificationsLib.addNotification(
              notificationsByUser,
              nextNotificationId,
              video.author,
              #moderation,
              "Your video \"" # video.title # "\" was approved",
              ?{ id = target.id; contentType = contentTypeText },
              now,
            );
          };
        };
      };
    };
  };

  /// Hide a flagged content item (blog/note/video). Requires Admin role.
  /// Sets `published = false` on the target and notifies the author.
  public shared ({ caller }) func hideContent(target : Types.ModerationTarget) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can hide content");
    };
    let now = Int.abs(Time.now());
    let contentTypeText = switch (target.contentType) {
      case (#blog) { "blog" };
      case (#note) { "note" };
      case (#video) { "video" };
    };
    switch (target.contentType) {
      case (#blog) {
        switch (blogs.find(func(b) { b.id == target.id })) {
          case null { Runtime.trap("Blog not found") };
          case (?blog) {
            blogs.mapInPlace(func(b) {
              if (b.id == target.id) {
                {
                  id = b.id;
                  author = b.author;
                  title = b.title;
                  content = b.content;
                  excerpt = b.excerpt;
                  tags = b.tags;
                  coverImageBlobId = b.coverImageBlobId;
                  createdAt = b.createdAt;
                  updatedAt = b.updatedAt;
                  published = false;
                  var viewCount = b.viewCount;
                  var likeCount = b.likeCount;
                };
              } else { b };
            });
            NotificationsLib.addNotification(
              notificationsByUser,
              nextNotificationId,
              blog.author,
              #moderation,
              "Your blog \"" # blog.title # "\" was hidden by moderation",
              ?{ id = target.id; contentType = contentTypeText },
              now,
            );
          };
        };
      };
      case (#note) {
        switch (notes.find(func(n) { n.id == target.id })) {
          case null { Runtime.trap("Note not found") };
          case (?note) {
            notes.mapInPlace(func(n) {
              if (n.id == target.id) {
                {
                  id = n.id;
                  author = n.author;
                  title = n.title;
                  description = n.description;
                  subject = n.subject;
                  fileType = n.fileType;
                  blobId = n.blobId;
                  fileSize = n.fileSize;
                  var downloadCount = n.downloadCount;
                  var likeCount = n.likeCount;
                  published = false;
                  createdAt = n.createdAt;
                  updatedAt = n.updatedAt;
                };
              } else { n };
            });
            NotificationsLib.addNotification(
              notificationsByUser,
              nextNotificationId,
              note.author,
              #moderation,
              "Your note \"" # note.title # "\" was hidden by moderation",
              ?{ id = target.id; contentType = contentTypeText },
              now,
            );
          };
        };
      };
      case (#video) {
        switch (videoStore.videos.get(target.id)) {
          case null { Runtime.trap("Video not found") };
          case (?video) {
            videoStore.videos.add(target.id, { video with published = false });
            NotificationsLib.addNotification(
              notificationsByUser,
              nextNotificationId,
              video.author,
              #moderation,
              "Your video \"" # video.title # "\" was hidden by moderation",
              ?{ id = target.id; contentType = contentTypeText },
              now,
            );
          };
        };
      };
    };
  };

  /// Delete a flagged content item (blog/note/video). Requires Admin role.
  /// Removes the item from its store and notifies the author.
  public shared ({ caller }) func deleteContent(target : Types.ModerationTarget) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete content");
    };
    let now = Int.abs(Time.now());
    let contentTypeText = switch (target.contentType) {
      case (#blog) { "blog" };
      case (#note) { "note" };
      case (#video) { "video" };
    };
    switch (target.contentType) {
      case (#blog) {
        switch (blogs.find(func(b) { b.id == target.id })) {
          case null { Runtime.trap("Blog not found") };
          case (?blog) {
            let author = blog.author;
            let title = blog.title;
            let kept = blogs.filter(func(b) { b.id != target.id });
            blogs.clear();
            blogs.addAll(kept.values());
            // Clean up comments/likes/bookmarks for this blog.
            let keptComments = comments.filter(func(c) { c.blogId != target.id });
            comments.clear();
            comments.addAll(keptComments.values());
            let keptLikes = blogLikes.filter(BlogTypes.compareBlogLike, func(l) { l.blogId != target.id });
            blogLikes.clear();
            blogLikes.addAll(BlogTypes.compareBlogLike, keptLikes.values());
            let keptBm = blogBookmarks.filter(BlogTypes.compareBlogBookmark, func(b) { b.blogId != target.id });
            blogBookmarks.clear();
            blogBookmarks.addAll(BlogTypes.compareBlogBookmark, keptBm.values());
            NotificationsLib.addNotification(
              notificationsByUser,
              nextNotificationId,
              author,
              #moderation,
              "Your blog \"" # title # "\" was deleted by moderation",
              ?{ id = target.id; contentType = contentTypeText },
              now,
            );
          };
        };
      };
      case (#note) {
        switch (notes.find(func(n) { n.id == target.id })) {
          case null { Runtime.trap("Note not found") };
          case (?note) {
            let author = note.author;
            let title = note.title;
            let kept = notes.filter(func(n) { n.id != target.id });
            notes.clear();
            notes.addAll(kept.values());
            let keptLikes = noteLikes.filter(NoteTypes.compareNoteLike, func(l) { l.noteId != target.id });
            noteLikes.clear();
            noteLikes.addAll(NoteTypes.compareNoteLike, keptLikes.values());
            let keptBm = noteBookmarks.filter(NoteTypes.compareNoteBookmark, func(b) { b.noteId != target.id });
            noteBookmarks.clear();
            noteBookmarks.addAll(NoteTypes.compareNoteBookmark, keptBm.values());
            NotificationsLib.addNotification(
              notificationsByUser,
              nextNotificationId,
              author,
              #moderation,
              "Your note \"" # title # "\" was deleted by moderation",
              ?{ id = target.id; contentType = contentTypeText },
              now,
            );
          };
        };
      };
      case (#video) {
        switch (videoStore.videos.get(target.id)) {
          case null { Runtime.trap("Video not found") };
          case (?video) {
            let author = video.author;
            let title = video.title;
            videoStore.videos.remove(target.id);
            videoStore.likes.remove(target.id);
            // Remove this video from every user's bookmark set.
            for ((_, ids) in videoStore.bookmarks.entries()) {
              if (ids.contains(target.id)) { ids.remove(target.id) };
            };
            NotificationsLib.addNotification(
              notificationsByUser,
              nextNotificationId,
              author,
              #moderation,
              "Your video \"" # title # "\" was deleted by moderation",
              ?{ id = target.id; contentType = contentTypeText },
              now,
            );
          };
        };
      };
    };
  };

  /// Change a user's role. Requires Admin role.
  /// Delegates to AccessControl.assignRole, mapping dashboards UserRole to
  /// AccessControl UserRole.
  public shared ({ caller }) func assignRole(
    user : Principal,
    role : Types.UserRole,
  ) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can assign roles");
    };
    let acRole : AccessControl.UserRole = switch (role) {
      case (#admin) { #admin };
      case (#creator) { #user };
      case (#user) { #user };
    };
    AccessControl.assignRole(accessControlState, caller, user, acRole);
    let now = Int.abs(Time.now());
    let roleText = switch (role) {
      case (#admin) { "admin" };
      case (#creator) { "creator" };
      case (#user) { "user" };
    };
    NotificationsLib.addNotification(
      notificationsByUser,
      nextNotificationId,
      user,
      #roleUpgrade,
      "Your role was changed to " # roleText,
      null,
      now,
    );
  };

  /// Suspend a user account. Requires Admin role.
  /// Maps to assigning the #guest role since AccessControl has no status field.
  public shared ({ caller }) func suspendUser(user : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can suspend users");
    };
    AccessControl.assignRole(accessControlState, caller, user, #guest);
    let now = Int.abs(Time.now());
    NotificationsLib.addNotification(
      notificationsByUser,
      nextNotificationId,
      user,
      #moderation,
      "Your account has been suspended",
      null,
      now,
    );
  };

  /// Reactivate a previously suspended user account. Requires Admin role.
  /// Maps to assigning the #user role.
  public shared ({ caller }) func activateUser(user : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can activate users");
    };
    AccessControl.assignRole(accessControlState, caller, user, #user);
    let now = Int.abs(Time.now());
    NotificationsLib.addNotification(
      notificationsByUser,
      nextNotificationId,
      user,
      #roleUpgrade,
      "Your account has been reactivated",
      null,
      now,
    );
  };
};
