import Array "mo:core/Array";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Types "../types/videos";

module {
  public type VideoStore = {
    videos : Map.Map<Types.VideoId, Types.Video>;
    nextId : { var value : Nat };
    likes : Map.Map<Types.VideoId, Set.Set<Principal>>;
    bookmarks : Map.Map<Principal, Set.Set<Types.VideoId>>;
    viewedSessions : Map.Map<Text, ()>;
  };

  public func newStore() : VideoStore {
    {
      videos = Map.empty();
      nextId = { var value = 0 };
      likes = Map.empty();
      bookmarks = Map.empty();
      viewedSessions = Map.empty();
    };
  };

  public func createVideo(
    store : VideoStore,
    author : Principal,
    input : Types.VideoInput,
    now : Int,
  ) : Types.Video {
    let id = store.nextId.value;
    store.nextId.value := store.nextId.value + 1;
    let video : Types.Video = {
      id;
      author;
      title = input.title;
      description = input.description;
      category = input.category;
      isShort = input.isShort;
      videoBlobId = input.videoBlobId;
      thumbnailBlobId = input.thumbnailBlobId;
      durationSeconds = input.durationSeconds;
      viewCount = 0;
      likeCount = 0;
      published = input.published;
      createdAt = now;
      updatedAt = now;
    };
    store.videos.add(id, video);
    video;
  };

  public func updateVideo(
    store : VideoStore,
    id : Types.VideoId,
    author : Principal,
    update : Types.VideoUpdate,
    now : Int,
  ) : ?Types.Video {
    switch (store.videos.get(id)) {
      case null { null };
      case (?video) {
        if (video.author != author) { return null };
        let updated : Types.Video = {
          id = video.id;
          author = video.author;
          title = switch (update.title) { case (?v) { v }; case null { video.title } };
          description = switch (update.description) { case (?v) { v }; case null { video.description } };
          category = switch (update.category) { case (?v) { v }; case null { video.category } };
          isShort = switch (update.isShort) { case (?v) { v }; case null { video.isShort } };
          videoBlobId = video.videoBlobId;
          thumbnailBlobId = switch (update.thumbnailBlobId) { case (?v) { v }; case null { video.thumbnailBlobId } };
          durationSeconds = video.durationSeconds;
          viewCount = video.viewCount;
          likeCount = video.likeCount;
          published = switch (update.published) { case (?v) { v }; case null { video.published } };
          createdAt = video.createdAt;
          updatedAt = now;
        };
        store.videos.add(id, updated);
        ?updated;
      };
    };
  };

  public func deleteVideo(
    store : VideoStore,
    id : Types.VideoId,
    author : Principal,
  ) : Bool {
    switch (store.videos.get(id)) {
      case null { false };
      case (?video) {
        if (video.author != author) { return false };
        store.videos.remove(id);
        store.likes.remove(id);
        true;
      };
    };
  };

  public func getVideo(store : VideoStore, id : Types.VideoId) : ?Types.Video {
    store.videos.get(id);
  };

  public func listVideos(
    store : VideoStore,
    filter : Types.VideoFilter,
  ) : Types.VideoPage {
    let all = store.videos.toArray();
    let filtered = all.filter(func(_, v) {
      if (not v.published) { return false };
      switch (filter.isShort) {
        case (?s) { if (v.isShort != s) { return false } };
        case null {};
      };
      switch (filter.category) {
        case (?c) { if (v.category != c) { return false } };
        case null {};
      };
      switch (filter.search) {
        case (?term) {
          let lower = term.toLower();
          if (v.title.toLower().contains(#text lower)) { return true };
          if (v.description.toLower().contains(#text lower)) { return true };
          return false;
        };
        case null { return true };
      };
    });
    let videosOnly = filtered.map(func(_, v) { v });
    let sorted = videosOnly.sort(func(a, b) {
      switch (filter.sort) {
        case (?#mostViewed) { Nat.compare(b.viewCount, a.viewCount) };
        case (?#mostLiked) { Nat.compare(b.likeCount, a.likeCount) };
        // Count bookmarks per video by iterating store.bookmarks
        // (Map<Principal, Set<VideoId>>). Build a per-id count map once,
        // then compare by real bookmark counts.
        case (?#mostBookmarked) {
          let counts = Map.empty<Types.VideoId, Nat>();
          for ((user, ids) in store.bookmarks.entries()) {
            for (id in ids.values()) {
              switch (counts.get(id)) {
                case (?c) { counts.add(id, c + 1) };
                case null { counts.add(id, 1) };
              };
            };
          };
          let ca = switch (counts.get(a.id)) { case (?c) { c }; case null { 0 } };
          let cb = switch (counts.get(b.id)) { case (?c) { c }; case null { 0 } };
          Nat.compare(cb, ca);
        };
        case (?#newest) { Int.compare(b.createdAt, a.createdAt) };
        case null { Int.compare(b.createdAt, a.createdAt) };
      };
    });
    let total = sorted.size();
    let page = switch (filter.page) { case (?p) { if (p < 1) { 1 } else { p } }; case null { 1 } };
    let pageSize = switch (filter.pageSize) { case (?s) { if (s == 0) { 10 } else { s } }; case null { 10 } };
    let start = (page - 1) * pageSize;
    let end = if (start + pageSize > total) { total } else { start + pageSize };
    let items = if (start >= total) { [] } else {
      Array.tabulate(end - start, func(i) { sorted[start + i] });
    };
    { items; total; page; pageSize };
  };

  /// Increment the view count of a video, deduplicated by session key.
  /// Returns true if the view was counted (new session), false otherwise.
  public func incrementView(
    store : VideoStore,
    id : Types.VideoId,
    sessionKey : Text,
  ) : Bool {
    if (store.viewedSessions.get(sessionKey) != null) { return false };
    store.viewedSessions.add(sessionKey, ());
    switch (store.videos.get(id)) {
      case null { return false };
      case (?video) {
        let updated : Types.Video = {
          id = video.id;
          author = video.author;
          title = video.title;
          description = video.description;
          category = video.category;
          isShort = video.isShort;
          videoBlobId = video.videoBlobId;
          thumbnailBlobId = video.thumbnailBlobId;
          durationSeconds = video.durationSeconds;
          viewCount = video.viewCount + 1;
          likeCount = video.likeCount;
          published = video.published;
          createdAt = video.createdAt;
          updatedAt = video.updatedAt;
        };
        store.videos.add(id, updated);
        true;
      };
    };
  };

  public func likeVideo(
    store : VideoStore,
    id : Types.VideoId,
    user : Principal,
  ) : Bool {
    switch (store.videos.get(id)) {
      case null { false };
      case (?video) {
        let likers = switch (store.likes.get(id)) {
          case (?s) { s };
          case null {
            let s = Set.empty<Principal>();
            store.likes.add(id, s);
            s;
          };
        };
        if (likers.contains(user)) { return false };
        likers.add(user);
        let updated : Types.Video = {
          video with
          likeCount = video.likeCount + 1;
        };
        store.videos.add(id, updated);
        true;
      };
    };
  };

  public func unlikeVideo(
    store : VideoStore,
    id : Types.VideoId,
    user : Principal,
  ) : Bool {
    switch (store.videos.get(id)) {
      case null { false };
      case (?video) {
        switch (store.likes.get(id)) {
          case null { false };
          case (?likers) {
            if (not likers.contains(user)) { return false };
            likers.remove(user);
            let updated : Types.Video = {
              video with
              likeCount = if (video.likeCount > 0) { video.likeCount - 1 } else { 0 };
            };
            store.videos.add(id, updated);
            true;
          };
        };
      };
    };
  };

  public func bookmarkVideo(
    store : VideoStore,
    id : Types.VideoId,
    user : Principal,
  ) : Bool {
    let userBookmarks = switch (store.bookmarks.get(user)) {
      case (?s) { s };
      case null {
        let s = Set.empty<Types.VideoId>();
        store.bookmarks.add(user, s);
        s;
      };
    };
    if (userBookmarks.contains(id)) { return false };
    userBookmarks.add(id);
    true;
  };

  public func unbookmarkVideo(
    store : VideoStore,
    id : Types.VideoId,
    user : Principal,
  ) : Bool {
    switch (store.bookmarks.get(user)) {
      case null { false };
      case (?userBookmarks) {
        if (not userBookmarks.contains(id)) { return false };
        userBookmarks.remove(id);
        true;
      };
    };
  };

  public func isLiked(
    store : VideoStore,
    id : Types.VideoId,
    user : Principal,
  ) : Bool {
    switch (store.likes.get(id)) {
      case null { false };
      case (?likers) { likers.contains(user) };
    };
  };

  public func isBookmarked(
    store : VideoStore,
    id : Types.VideoId,
    user : Principal,
  ) : Bool {
    switch (store.bookmarks.get(user)) {
      case null { false };
      case (?userBookmarks) { userBookmarks.contains(id) };
    };
  };

  /// Collect all video ids bookmarked by `user`.
  public func bookmarkedIds(store : VideoStore, user : Principal) : [Types.VideoId] {
    switch (store.bookmarks.get(user)) {
      case null { [] };
      case (?userBookmarks) { userBookmarks.toArray() };
    };
  };

  /// Collect all video ids liked by `user`.
  public func likedIds(store : VideoStore, user : Principal) : [Types.VideoId] {
    let arr = store.likes.toArray();
    arr.foldLeft<(Types.VideoId, Set.Set<Principal>), [Types.VideoId]>(
      [],
      func(acc, (id, likers)) {
        if (likers.contains(user)) {
          acc.concat([id]);
        } else { acc };
      },
    );
  };
};
