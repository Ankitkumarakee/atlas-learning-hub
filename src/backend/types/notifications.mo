module {
  /// Cross-cutting timestamp type (nanoseconds since epoch, Time.now()).
  public type Timestamp = Nat;

  /// Stable, unique identifier for a notification.
  public type NotificationId = Nat;

  /// The kind of event that produced the notification.
  public type NotificationType = {
    #like; // someone liked the recipient's content
    #comment; // someone commented on the recipient's content
    #roleUpgrade; // the recipient's role was upgraded
    #moderation; // a moderation action affected the recipient's content
    #systemMessage; // a platform-wide system message
  };

  /// Identifies the content that triggered the notification, if any.
  public type SourceContent = {
    id : Nat; // content id (blog id, note id, video id, comment id, ...)
    contentType : Text; // "blog" | "note" | "video" | "comment" | ...
  };

  /// Internal stable notification record. `read` is mutable so it can be
  /// flipped in place when the recipient marks it read.
  public type Notification = {
    id : NotificationId;
    recipient : Principal;
    notificationType : NotificationType;
    content : Text; // human-readable message body
    source : ?SourceContent; // optional reference to the triggering content
    createdAt : Timestamp;
    var read : Bool;
  };

  /// Shared (serializable) view of a notification for the API boundary.
  /// Mirrors `Notification` but exposes `read` as an immutable `Bool`.
  public type NotificationView = {
    id : NotificationId;
    recipient : Principal;
    notificationType : NotificationType;
    content : Text;
    source : ?SourceContent;
    createdAt : Timestamp;
    read : Bool;
  };

  /// Result of listing a user's notifications, including the unread count.
  public type ListNotificationsResult = {
    items : [NotificationView];
    unreadCount : Nat;
  };
};
