import Map "mo:core/Map";
import List "mo:core/List";
import Set "mo:core/Set";
import Principal "mo:core/Principal";

import MixinViews "mo:caffeineai-data-viewer/MixinViews";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";

import BlogTypes "types/blogs";
import NoteTypes "types/notes";
import VideoTypes "types/videos";
import NotificationTypes "types/notifications";
import AITutorTypes "types/ai-tutor";
import DashboardsTypes "types/dashboards";

import Videos "lib/videos";

import BlogsApi "mixins/blogs-api";
import NotesApi "mixins/notes-api";
import VideosApi "mixins/videos-api";
import AITutorApi "mixins/ai-tutor-api";
import DashboardsApi "mixins/dashboards-api";
import NotificationsApi "mixins/notifications-api";

// Composition root for the Atlas Learning Hub backend canister.
//
// This actor owns all stable state and delegates every public method to the
// domain mixins. No business logic lives here. Stable fields are declared
// with types only — initial values come from the migration chain in
// src/backend/migrations/.
//
// All domain mixins use the state-injection pattern: state is passed to the
// mixin at include-time, and public shared methods take only shared types.
// No thin wrapper methods are needed here — the mixin's public methods are
// promoted directly to the actor's public API.
actor {
  // -------------------------------------------------------------------------
  // ALL stable state declarations MUST come before any include statement that
  // references them. Motoko requires mixin parameters to be in scope at the
  // point of the include.
  // -------------------------------------------------------------------------

  // Authorization state
  let accessControlState : AccessControl.AccessControlState;

  // Blogs domain state
  let blogs : List.List<BlogTypes.Blog>;
  let comments : List.List<BlogTypes.Comment>;
  let blogLikes : Set.Set<BlogTypes.BlogLike>;
  let blogBookmarks : Set.Set<BlogTypes.BlogBookmark>;
  let commentLikes : Set.Set<BlogTypes.CommentLike>;
  let nextBlogId : { var next : Nat };
  let nextCommentId : { var next : Nat };

  // Notes domain state
  let notes : List.List<NoteTypes.Note>;
  let nextNoteId : { var value : Nat };
  let noteLikes : Set.Set<NoteTypes.NoteLike>;
  let noteBookmarks : Set.Set<NoteTypes.NoteBookmark>;

  // Videos domain state
  let videoStore : Videos.VideoStore;

  // AI tutor domain state
  let conversations : List.List<AITutorTypes.Conversation>;
  let messages : List.List<AITutorTypes.Message>;
  let nextConversationId : { var value : Nat };
  let nextMessageId : { var value : Nat };

  // Notifications domain state
  let notificationsByUser : Map.Map<Principal, List.List<NotificationTypes.Notification>>;
  let nextNotificationId : { var value : Nat };

  // -------------------------------------------------------------------------
  // Mixin includes — all state above is now in scope.
  // -------------------------------------------------------------------------

  // Existing platform mixins (data-viewer + authorization)
  include MixinViews();
  include MixinAuthorization(accessControlState, null);

  // Blogs domain
  include BlogsApi(
    blogs,
    comments,
    blogLikes,
    blogBookmarks,
    commentLikes,
    nextBlogId,
    nextCommentId,
    accessControlState,
    notificationsByUser,
    nextNotificationId,
  );

  // Notes domain
  include NotesApi(
    notes,
    nextNoteId,
    noteLikes,
    noteBookmarks,
    accessControlState,
    notificationsByUser,
    nextNotificationId,
  );

  // Videos domain
  include VideosApi(
    videoStore,
    accessControlState,
    notificationsByUser,
    nextNotificationId,
  );

  // AI tutor domain
  include AITutorApi(
    conversations,
    messages,
    nextConversationId,
    nextMessageId,
    accessControlState,
    blogs,
    notes,
    videoStore,
  );

  // Dashboards domain (no own state; aggregates from other domains)
  include DashboardsApi(
    accessControlState,
    blogs,
    notes,
    videoStore,
    blogBookmarks,
    noteBookmarks,
    blogLikes,
    noteLikes,
    conversations,
    messages,
    notificationsByUser,
    nextNotificationId,
  );

  // Notifications domain
  include NotificationsApi(notificationsByUser, nextNotificationId);
};
