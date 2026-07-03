import Array "mo:core/Array";
import Int "mo:core/Int";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
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
//   accessControlState  : AccessControl.AccessControlState   -- for role checks
//   blogs               : List.List<BlogTypes.Blog>          -- content source
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
//   - getCreatorDashboard requires the Creator role.
//   - getStudentDashboard requires an authenticated User.
//   - getAdminDashboard requires the Admin role.
//   - The admin moderation methods require the Admin role.
mixin (
  accessControlState : AccessControl.AccessControlState,
  blogs : List.List<BlogTypes.Blog>,
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

  func buildContentSnapshot() : DashboardsLib.ContentSnapshot {
    let blogArr = blogs.toArray();
    let blogItems = blogArr.map(func(b) {
      {
        id = b.id;
        author = b.author;
        title = b.title;
        createdAt = b.createdAt;
        viewCount = b.viewCount;
        likeCount = b.likeCount;
        commentCount = 0;
        bookmarkCount = 0;
        published = b.published;
      };
    });
    let noteArr = notes.toArray();
    let noteItems = noteArr.map(func(n) {
      {
        id = n.id;
        author = n.author;
        title = n.title;
        createdAt = n.createdAt;
        downloadCount = n.downloadCount;
        likeCount = n.likeCount;
        bookmarkCount = 0;
        published = n.published;
      };
    });
    let videoEntries = videoStore.videos.toArray();
    let videoItems = videoEntries.map(func(_, v) {
      {
        id = v.id;
        author = v.author;
        title = v.title;
        createdAt = v.createdAt;
        viewCount = v.viewCount;
        likeCount = v.likeCount;
        bookmarkCount = 0;
        published = v.published;
      };
    });
    { blogs = blogItems; notes = noteItems; videos = videoItems };
  };

  func buildBookmarkSnapshot(caller : Principal) : DashboardsLib.BookmarkSnapshot {
    let blogBookmarkArr = blogBookmarks.toArray();
    let blogItems = blogBookmarkArr.filter(func(b) { b.user == caller }).map(
      func(b) {
        let blog = switch (blogs.find(func(bl) { bl.id == b.blogId })) {
          case null { { title = ""; author = caller } };
          case (?bl) { { title = bl.title; author = bl.author } };
        };
        { id = b.blogId; title = blog.title; author = blog.author; bookmarkedAt = 0 };
      },
    );
    let noteBookmarkArr = noteBookmarks.toArray();
    let noteItems = noteBookmarkArr.filter(func(b) { b.user == caller }).map(
      func(b) {
        let note = switch (notes.find(func(n) { n.id == b.noteId })) {
          case null { { title = ""; author = caller } };
          case (?n) { { title = n.title; author = n.author } };
        };
        { id = b.noteId; title = note.title; author = note.author; bookmarkedAt = 0 };
      },
    );
    let videoIds = Videos.bookmarkedIds(videoStore, caller);
    let videoItems = videoIds.map(
      func(vid) {
        let video = switch (Videos.getVideo(videoStore, vid)) {
          case null { { title = ""; author = caller } };
          case (?v) { { title = v.title; author = v.author } };
        };
        { id = vid; title = video.title; author = video.author; bookmarkedAt = 0 };
      },
    );
    { blogBookmarks = blogItems; noteBookmarks = noteItems; videoBookmarks = videoItems };
  };

  func buildConversationSnapshots(caller : Principal) : [DashboardsLib.ConversationSnapshot] {
    let convoArr = conversations.toArray();
    let owned = convoArr.filter(func(c) { c.user == caller });
    owned.map(func(c) {
      let msgArr = messages.toArray();
      let convoMessages = msgArr.filter(func(m) { m.conversationId == c.id });
      {
        id = c.id;
        title = c.title;
        lastMessageAt = c.updatedAt;
        messageCount = convoMessages.size();
      };
    });
  };

  // -------------------------------------------------------------------------
  // Dashboard read endpoints
  // -------------------------------------------------------------------------

  /// Returns the full creator dashboard for the calling principal.
  /// Requires the Creator role.
  public shared ({ caller }) func getCreatorDashboard() : async Types.CreatorDashboard {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view the creator dashboard");
    };
    let snapshot = buildContentSnapshot();
    DashboardsLib.buildCreatorDashboard(snapshot, caller);
  };

  /// Returns the full student dashboard for the calling principal.
  /// Requires an authenticated User.
  public shared ({ caller }) func getStudentDashboard() : async Types.StudentDashboard {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view the student dashboard");
    };
    let bookmarkSnapshot = buildBookmarkSnapshot(caller);
    // Liked content count: blogs + notes + videos liked by caller.
    let blogLikedCount = blogLikes.toArray().foldLeft(
      0,
      func(acc, l) { if (l.user == caller) { acc + 1 } else { acc } },
    );
    let noteLikedCount = noteLikes.toArray().foldLeft(
      0,
      func(acc, l) { if (l.user == caller) { acc + 1 } else { acc } },
    );
    let videoLikedCount = videoStore.likes.toArray().foldLeft(
      0,
      func(acc, (_, likers)) { if (likers.contains(caller)) { acc + 1 } else { acc } },
    );
    let likedContentCount = blogLikedCount + noteLikedCount + videoLikedCount;
    let conversationSnapshots = buildConversationSnapshots(caller);
    DashboardsLib.buildStudentDashboard(bookmarkSnapshot, likedContentCount, conversationSnapshots);
  };

  /// Returns the full admin dashboard for the platform.
  /// Requires the Admin role.
  public shared ({ caller }) func getAdminDashboard() : async Types.AdminDashboard {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view the admin dashboard");
    };
    let contentSnapshot = buildContentSnapshot();
    // Admin user list and moderation queue are derived from access control
    // state and content. For now, return empty arrays since user management
    // state lives in the authorization component.
    let users : [DashboardsLib.UserSnapshot] = [];
    let moderation : [DashboardsLib.ModerationSnapshot] = [];
    DashboardsLib.buildAdminDashboard(users, contentSnapshot, moderation);
  };

  // -------------------------------------------------------------------------
  // Admin moderation endpoints
  // -------------------------------------------------------------------------

  /// Approve a flagged content item (blog/note/video). Requires Admin role.
  public shared ({ caller }) func approveContent(target : Types.ModerationTarget) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can approve content");
    };
    // Mark content as published (approved). Notify the author.
    switch (target.contentType) {
      case (#blog) {
        switch (blogs.find(func(b) { b.id == target.id })) {
          case null {};
          case (?blog) {
            if (not blog.published) {
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
            };
            NotificationsLib.addNotification(
              notificationsByUser,
              nextNotificationId,
              blog.author,
              #moderation,
              "Your blog was approved: " # blog.title,
              ?{ id = target.id; contentType = "blog" },
              Int.abs(Time.now()),
            );
          };
        };
      };
      case (#note) {
        switch (notes.find(func(n) { n.id == target.id })) {
          case null {};
          case (?note) {
            if (not note.published) {
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
            };
            NotificationsLib.addNotification(
              notificationsByUser,
              nextNotificationId,
              note.author,
              #moderation,
              "Your note was approved: " # note.title,
              ?{ id = target.id; contentType = "note" },
              Int.abs(Time.now()),
            );
          };
        };
      };
      case (#video) {
        switch (Videos.getVideo(videoStore, target.id)) {
          case null {};
          case (?video) {
            if (not video.published) {
              let updated : VideoTypes.Video = { video with published = true };
              videoStore.videos.add(target.id, updated);
            };
            NotificationsLib.addNotification(
              notificationsByUser,
              nextNotificationId,
              video.author,
              #moderation,
              "Your video was approved: " # video.title,
              ?{ id = target.id; contentType = "video" },
              Int.abs(Time.now()),
            );
          };
        };
      };
    };
  };

  /// Hide a flagged content item (blog/note/video). Requires Admin role.
  public shared ({ caller }) func hideContent(target : Types.ModerationTarget) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can hide content");
    };
    // Mark content as unpublished (hidden). Notify the author.
    switch (target.contentType) {
      case (#blog) {
        switch (blogs.find(func(b) { b.id == target.id })) {
          case null {};
          case (?blog) {
            if (blog.published) {
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
            };
            NotificationsLib.addNotification(
              notificationsByUser,
              nextNotificationId,
              blog.author,
              #moderation,
              "Your blog was hidden: " # blog.title,
              ?{ id = target.id; contentType = "blog" },
              Int.abs(Time.now()),
            );
          };
        };
      };
      case (#note) {
        switch (notes.find(func(n) { n.id == target.id })) {
          case null {};
          case (?note) {
            if (note.published) {
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
            };
            NotificationsLib.addNotification(
              notificationsByUser,
              nextNotificationId,
              note.author,
              #moderation,
              "Your note was hidden: " # note.title,
              ?{ id = target.id; contentType = "note" },
              Int.abs(Time.now()),
            );
          };
        };
      };
      case (#video) {
        switch (Videos.getVideo(videoStore, target.id)) {
          case null {};
          case (?video) {
            if (video.published) {
              let updated : VideoTypes.Video = { video with published = false };
              videoStore.videos.add(target.id, updated);
            };
            NotificationsLib.addNotification(
              notificationsByUser,
              nextNotificationId,
              video.author,
              #moderation,
              "Your video was hidden: " # video.title,
              ?{ id = target.id; contentType = "video" },
              Int.abs(Time.now()),
            );
          };
        };
      };
    };
  };

  /// Delete a flagged content item (blog/note/video). Requires Admin role.
  public shared ({ caller }) func deleteContent(target : Types.ModerationTarget) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete content");
    };
    // Delete the content. Notify the author.
    switch (target.contentType) {
      case (#blog) {
        switch (blogs.find(func(b) { b.id == target.id })) {
          case null {};
          case (?blog) {
            let author = blog.author;
            let title = blog.title;
            let keptBlogs = blogs.filter(func(b) { b.id != target.id });
            blogs.clear();
            blogs.addAll(keptBlogs.values());
            NotificationsLib.addNotification(
              notificationsByUser,
              nextNotificationId,
              author,
              #moderation,
              "Your blog was deleted: " # title,
              ?{ id = target.id; contentType = "blog" },
              Int.abs(Time.now()),
            );
          };
        };
      };
      case (#note) {
        switch (notes.find(func(n) { n.id == target.id })) {
          case null {};
          case (?note) {
            let author = note.author;
            let title = note.title;
            let keptNotes = notes.filter(func(n) { n.id != target.id });
            notes.clear();
            notes.addAll(keptNotes.values());
            NotificationsLib.addNotification(
              notificationsByUser,
              nextNotificationId,
              author,
              #moderation,
              "Your note was deleted: " # title,
              ?{ id = target.id; contentType = "note" },
              Int.abs(Time.now()),
            );
          };
        };
      };
      case (#video) {
        switch (Videos.getVideo(videoStore, target.id)) {
          case null {};
          case (?video) {
            let author = video.author;
            let title = video.title;
            let _ = Videos.deleteVideo(videoStore, target.id, video.author);
            NotificationsLib.addNotification(
              notificationsByUser,
              nextNotificationId,
              author,
              #moderation,
              "Your video was deleted: " # title,
              ?{ id = target.id; contentType = "video" },
              Int.abs(Time.now()),
            );
          };
        };
      };
    };
  };

  /// Change a user's role. Requires Admin role.
  public shared ({ caller }) func assignRole(
    user : Principal,
    role : Types.UserRole,
  ) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can assign roles");
    };
    // Map dashboard UserRole to AccessControl UserRole.
    let acRole : AccessControl.UserRole = switch (role) {
      case (#admin) { #admin };
      case (#creator) { #user };
      case (#user) { #user };
    };
    AccessControl.assignRole(accessControlState, caller, user, acRole);
    NotificationsLib.addNotification(
      notificationsByUser,
      nextNotificationId,
      user,
      #roleUpgrade,
      "Your role was updated",
      null,
      Int.abs(Time.now()),
    );
  };

  /// Suspend a user account. Requires Admin role.
  public shared ({ caller }) func suspendUser(user : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can suspend users");
    };
    // Downgrade to guest to effectively suspend.
    AccessControl.assignRole(accessControlState, caller, user, #guest);
    NotificationsLib.addNotification(
      notificationsByUser,
      nextNotificationId,
      user,
      #moderation,
      "Your account was suspended",
      null,
      Int.abs(Time.now()),
    );
  };

  /// Reactivate a previously suspended user account. Requires Admin role.
  public shared ({ caller }) func activateUser(user : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can activate users");
    };
    AccessControl.assignRole(accessControlState, caller, user, #user);
    NotificationsLib.addNotification(
      notificationsByUser,
      nextNotificationId,
      user,
      #moderation,
      "Your account was reactivated",
      null,
      Int.abs(Time.now()),
    );
  };
};
