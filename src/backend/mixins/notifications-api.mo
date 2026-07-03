import Array "mo:core/Array";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Types "../types/notifications";
import NotificationsLib "../lib/notifications";

// Public API surface for the notifications domain.
//
// State is injected via the mixin parameter: a Map keyed by recipient
// principal, whose value is the List of that user's notifications. The
// `nextNotificationId` counter is wrapped in a `{ var value : Nat }` record
// so mutations propagate back to main.mo.
//
// `createNotification` is exposed as a public async method so other mixins
// (blogs/notes/videos/dashboards) can call it via `await createNotification(...)`.
// It is not intended to be called directly by end users.
mixin (
  notificationsByUser : Map.Map<Principal, List.List<Types.Notification>>,
  nextNotificationId : { var value : Nat },
) {
  /// Create a notification for a recipient and append it to their list.
  /// Intended to be called by other domains (Blog, Note, Video, moderation)
  /// when relevant events occur. Not a user-facing endpoint.
  public func createNotification(
    recipient : Principal,
    notificationType : Types.NotificationType,
    content : Text,
    source : ?Types.SourceContent,
  ) : async () {
    NotificationsLib.addNotification(
      notificationsByUser,
      nextNotificationId,
      recipient,
      notificationType,
      content,
      source,
      Int.abs(Time.now()),
    );
  };

  /// List the calling user's notifications, newest first, with the unread
  /// count. Requires an authenticated caller.
  public shared ({ caller }) func listNotifications() : async Types.ListNotificationsResult {
    let userNotifications = switch (notificationsByUser.get(caller)) {
      case null {
        return { items = []; unreadCount = 0 };
      };
      case (?list) { list };
    };
    let arr = userNotifications.toArray();
    let sorted = arr.sort(func(a, b) {
      Nat.compare(b.createdAt, a.createdAt);
    });
    let views = sorted.map(func(n) {
      NotificationsLib.toNotificationView(n);
    });
    let unreadCount = NotificationsLib.countUnread(arr, caller);
    { items = views; unreadCount };
  };

  /// Mark a single notification as read for the calling user.
  /// Requires an authenticated caller; the notification must belong to them.
  public shared ({ caller }) func markNotificationRead(notificationId : Types.NotificationId) : async () {
    let userNotifications = switch (notificationsByUser.get(caller)) {
      case null { Runtime.trap("No notifications for caller") };
      case (?list) { list };
    };
    switch (userNotifications.find(func(n) { n.id == notificationId })) {
      case null { Runtime.trap("Notification not found") };
      case (?notification) {
        NotificationsLib.markRead(notification);
      };
    };
  };

  /// Mark every notification as read for the calling user.
  /// Requires an authenticated caller.
  public shared ({ caller }) func markAllNotificationsRead() : async () {
    let userNotifications = switch (notificationsByUser.get(caller)) {
      case null { return };
      case (?list) { list };
    };
    userNotifications.mapInPlace(func(n) {
      { n with var read = true };
    });
  };
};
