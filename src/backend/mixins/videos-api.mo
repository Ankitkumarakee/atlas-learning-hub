import Array "mo:core/Array";
import List "mo:core/List";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Int "mo:core/Int";
import AccessControl "mo:caffeineai-authorization/access-control";
import Videos "../lib/videos";
import Types "../types/videos";
import NotificationTypes "../types/notifications";
import NotificationsLib "../lib/notifications";

// Public API surface for the videos domain.
//
// State injected via the mixin parameter:
//   store : Videos.VideoStore -- all video state (videos, likes, bookmarks, views)
//   accessControlState : AccessControl.AccessControlState -- for role checks
//   notificationsByUser : Map.Map<Principal, List.List<NotificationTypes.Notification>>
//   nextNotificationId : { var value : Nat } -- notification id counter
mixin (
  store : Videos.VideoStore,
  accessControlState : AccessControl.AccessControlState,
  notificationsByUser : Map.Map<Principal, List.List<NotificationTypes.Notification>>,
  nextNotificationId : { var value : Nat },
) {
  public shared ({ caller }) func createVideo(input : Types.VideoInput) : async Types.Video {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can create videos");
    };
    Videos.createVideo(store, caller, input, Time.now());
  };

  public shared ({ caller }) func updateVideo(
    id : Types.VideoId,
    update : Types.VideoUpdate,
  ) : async ?Types.Video {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can update videos");
    };
    Videos.updateVideo(store, id, caller, update, Time.now());
  };

  public shared ({ caller }) func deleteVideo(id : Types.VideoId) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can delete videos");
    };
    Videos.deleteVideo(store, id, caller);
  };

  public query func getVideo(id : Types.VideoId) : async ?Types.Video {
    Videos.getVideo(store, id);
  };

  public query func listVideos(filter : Types.VideoFilter) : async Types.VideoPage {
    Videos.listVideos(store, filter);
  };

  public shared ({ caller }) func incrementView(
    id : Types.VideoId,
    sessionKey : Text,
  ) : async Bool {
    Videos.incrementView(store, id, sessionKey);
  };

  public shared ({ caller }) func likeVideo(id : Types.VideoId) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can like videos");
    };
    let added = Videos.likeVideo(store, id, caller);
    if (added) {
      // Notify the video author (skip self-likes).
      switch (Videos.getVideo(store, id)) {
        case null {};
        case (?video) {
          if (video.author != caller) {
            NotificationsLib.addNotification(
              notificationsByUser,
              nextNotificationId,
              video.author,
              #like,
              "Someone liked your video: " # video.title,
              ?{ id = id; contentType = "video" },
              Int.abs(Time.now()),
            );
          };
        };
      };
    };
    added;
  };

  public shared ({ caller }) func unlikeVideo(id : Types.VideoId) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can unlike videos");
    };
    Videos.unlikeVideo(store, id, caller);
  };

  public shared ({ caller }) func bookmarkVideo(id : Types.VideoId) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can bookmark videos");
    };
    Videos.bookmarkVideo(store, id, caller);
  };

  public shared ({ caller }) func unbookmarkVideo(id : Types.VideoId) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can unbookmark videos");
    };
    Videos.unbookmarkVideo(store, id, caller);
  };

  public shared ({ caller }) func isVideoLiked(id : Types.VideoId) : async Bool {
    Videos.isLiked(store, id, caller);
  };

  public shared ({ caller }) func isVideoBookmarked(id : Types.VideoId) : async Bool {
    Videos.isBookmarked(store, id, caller);
  };
};
