import Array "mo:core/Array";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Types "../types/notifications";

// Domain logic for the notifications domain.
module {
  public type Notification = Types.Notification;
  public type NotificationView = Types.NotificationView;
  public type NotificationId = Types.NotificationId;
  public type NotificationType = Types.NotificationType;
  public type SourceContent = Types.SourceContent;
  public type ListNotificationsResult = Types.ListNotificationsResult;
  public type Timestamp = Types.Timestamp;

  /// Convert an internal Notification to its shared view.
  public func toNotificationView(notification : Notification) : NotificationView {
    {
      id = notification.id;
      recipient = notification.recipient;
      notificationType = notification.notificationType;
      content = notification.content;
      source = notification.source;
      createdAt = notification.createdAt;
      read = notification.read;
    };
  };

  /// Construct a new notification record. `read` starts as `false`.
  public func createNotification(
    id : NotificationId,
    recipient : Principal,
    notificationType : NotificationType,
    content : Text,
    source : ?SourceContent,
    now : Timestamp,
  ) : Notification {
    {
      id;
      recipient;
      notificationType;
      content;
      source;
      createdAt = now;
      var read = false;
    };
  };

  /// Shared helper used by other mixins (blogs/notes/videos/dashboards) to
  /// create a notification directly on the notifications map. This avoids
  /// cross-mixin async calls to `createNotification`, which do not resolve
  /// reliably. Mutates `notificationsByUser` and `nextNotificationId`.
  public func addNotification(
    notificationsByUser : Map.Map<Principal, List.List<Notification>>,
    nextNotificationId : { var value : Nat },
    recipient : Principal,
    notificationType : NotificationType,
    content : Text,
    source : ?SourceContent,
    now : Timestamp,
  ) : () {
    let id = nextNotificationId.value;
    nextNotificationId.value := nextNotificationId.value + 1;
    let notification = createNotification(id, recipient, notificationType, content, source, now);
    let userNotifications = switch (notificationsByUser.get(recipient)) {
      case null {
        let list = List.empty<Notification>();
        notificationsByUser.add(recipient, list);
        list;
      };
      case (?list) { list };
    };
    userNotifications.add(notification);
  };

  /// Mark a single notification as read (mutates `read` in place).
  public func markRead(notification : Notification) : () {
    notification.read := true;
  };

  /// Count how many of the given notifications are unread for a recipient.
  public func countUnread(notifications : [Notification], recipient : Principal) : Nat {
    notifications.foldLeft(
      0,
      func(acc, n) {
        if (n.recipient == recipient and not n.read) { acc + 1 } else { acc };
      },
    );
  };

  /// Filter notifications belonging to a recipient, newest first.
  public func forRecipient(notifications : [Notification], recipient : Principal) : [Notification] {
    let filtered = notifications.filter(func(n) {
      n.recipient == recipient;
    });
    filtered.sort(func(a, b) {
      Nat.compare(b.createdAt, a.createdAt);
    });
  };
};
