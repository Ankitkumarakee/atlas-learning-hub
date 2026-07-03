import Array "mo:core/Array";
import List "mo:core/List";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Int "mo:core/Int";
import AccessControl "mo:caffeineai-authorization/access-control";
import Types "../types/blogs";
import BlogTypes "../types/blogs";
import NotificationTypes "../types/notifications";
import BlogLib "../lib/blogs";
import NotificationsLib "../lib/notifications";

// Public API surface for the blogs domain.
//
// State injected via the mixin parameter:
//   blogs            : List.List<Types.Blog>            -- all blog posts
//   comments         : List.List<Types.Comment>        -- all comments
//   blogLikes        : Set.Set<Types.BlogLike>          -- per-user blog likes
//   blogBookmarks    : Set.Set<Types.BlogBookmark>      -- per-user bookmarks
//   commentLikes     : Set.Set<Types.CommentLike>       -- per-user comment likes
//   nextBlogId       : { var next : Nat }               -- blog id counter
//   nextCommentId    : { var next : Nat }               -- comment id counter
//   accessControlState : AccessControl.AccessControlState -- for role checks
//   notificationsByUser : Map.Map<Principal, List.List<NotificationTypes.Notification>>
//   nextNotificationId : { var value : Nat }            -- notification id counter
mixin (
  blogs : List.List<Types.Blog>,
  comments : List.List<Types.Comment>,
  blogLikes : Set.Set<Types.BlogLike>,
  blogBookmarks : Set.Set<Types.BlogBookmark>,
  commentLikes : Set.Set<Types.CommentLike>,
  nextBlogId : { var next : Nat },
  nextCommentId : { var next : Nat },
  accessControlState : AccessControl.AccessControlState,
  notificationsByUser : Map.Map<Principal, List.List<NotificationTypes.Notification>>,
  nextNotificationId : { var value : Nat },
) {
  // Create a new blog post. Requires authenticated User or Creator role; author = caller.
  public shared ({ caller }) func createBlog(
    title : Text,
    content : Text,
    excerpt : Text,
    tags : [Text],
    coverImageBlobId : ?Blob,
    published : Bool,
  ) : async Types.BlogView {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can create blogs");
    };
    let id = nextBlogId.next;
    nextBlogId.next := nextBlogId.next + 1;
    let blog = BlogLib.createBlog(id, caller, title, content, excerpt, tags, coverImageBlobId, Int.abs(Time.now()), published);
    blogs.add(blog);
    BlogLib.toBlogView(blog);
  };

  // Update an existing blog post. Requires ownership.
  public shared ({ caller }) func updateBlog(
    id : Types.BlogId,
    title : Text,
    content : Text,
    excerpt : Text,
    tags : [Text],
    coverImageBlobId : ?Blob,
    published : Bool,
  ) : async Types.BlogView {
    switch (blogs.find(func(b) { b.id == id })) {
      case null { Runtime.trap("Blog not found") };
      case (?blog) {
        if (blog.author != caller) {
          Runtime.trap("Unauthorized: Only the author can update this blog");
        };
        let updated = BlogLib.updateBlogFields(blog, title, content, excerpt, tags, coverImageBlobId, published, Int.abs(Time.now()));
        blogs.mapInPlace(func(b) {
          if (b.id == id) { updated } else { b };
        });
        BlogLib.toBlogView(updated);
      };
    };
  };

  // Delete a blog post (and its comments). Requires ownership.
  public shared ({ caller }) func deleteBlog(id : Types.BlogId) : async () {
    switch (blogs.find(func(b) { b.id == id })) {
      case null { Runtime.trap("Blog not found") };
      case (?blog) {
        if (blog.author != caller) {
          Runtime.trap("Unauthorized: Only the author can delete this blog");
        };
        let keptBlogs = blogs.filter(func(b) { b.id != id });
        blogs.clear();
        blogs.addAll(keptBlogs.values());
        let keptComments = comments.filter(func(c) { c.blogId != id });
        comments.clear();
        comments.addAll(keptComments.values());
        // Clean up likes/bookmarks for this blog.
        let keptBlogLikes = blogLikes.filter(Types.compareBlogLike, func(l) { l.blogId != id });
        blogLikes.clear();
        blogLikes.addAll(Types.compareBlogLike, keptBlogLikes.values());
        let keptBlogBookmarks = blogBookmarks.filter(Types.compareBlogBookmark, func(b) { b.blogId != id });
        blogBookmarks.clear();
        blogBookmarks.addAll(Types.compareBlogBookmark, keptBlogBookmarks.values());
      };
    };
  };

  // Get a single blog post by id (public read). Increments view count.
  public query func getBlog(id : Types.BlogId) : async ?Types.BlogView {
    switch (blogs.find(func(b) { b.id == id })) {
      case null { null };
      case (?blog) { ?BlogLib.toBlogView(blog) };
    };
  };

  // List blogs with search/filter/sort/pagination (public read).
  public query func listBlogs(q : Types.ListBlogsQuery) : async Types.ListBlogsResult {
    let arr = blogs.toArray();
    let filtered = arr.filter(func(b) { BlogLib.matchesQuery(b, q) });
    let sorted = filtered.sort(func(a, b) { BlogLib.compareForSort(a, b, q.sort) });
    let total = sorted.size();
    let page = if (q.page < 1) { 1 } else { q.page };
    let pageSize = if (q.pageSize == 0) { 10 } else { q.pageSize };
    let start = (page - 1) * pageSize;
    let end = if (start + pageSize > total) { total } else { start + pageSize };
    let items = if (start >= total) { [] } else {
      Array.tabulate(end - start, func(i) {
        BlogLib.toBlogView(sorted[start + i]);
      });
    };
    { items; total; page; pageSize };
  };

  // Like a blog post. Requires authenticated User or Creator role.
  public shared ({ caller }) func likeBlog(id : Types.BlogId) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can like blogs");
    };
    let key : Types.BlogLike = { blogId = id; user = caller };
    if (blogLikes.contains(Types.compareBlogLike, key)) { return };
    blogLikes.add(Types.compareBlogLike, key);
    switch (blogs.find(func(b) { b.id == id })) {
      case null { Runtime.trap("Blog not found") };
      case (?blog) {
        blog.likeCount := blog.likeCount + 1;
        // Notify the blog author (skip self-likes).
        if (blog.author != caller) {
          NotificationsLib.addNotification(
            notificationsByUser,
            nextNotificationId,
            blog.author,
            #like,
            "Someone liked your blog: " # blog.title,
            ?{ id = id; contentType = "blog" },
            Int.abs(Time.now()),
          );
        };
      };
    };
  };

  // Remove a like from a blog post. Requires authenticated User or Creator role.
  public shared ({ caller }) func unlikeBlog(id : Types.BlogId) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can unlike blogs");
    };
    let key : Types.BlogLike = { blogId = id; user = caller };
    if (not blogLikes.contains(Types.compareBlogLike, key)) { return };
    blogLikes.remove(Types.compareBlogLike, key);
    switch (blogs.find(func(b) { b.id == id })) {
      case null {};
      case (?blog) {
        if (blog.likeCount > 0) { blog.likeCount := blog.likeCount - 1 };
      };
    };
  };

  // Bookmark a blog post. Requires authenticated User or Creator role.
  public shared ({ caller }) func bookmarkBlog(id : Types.BlogId) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can bookmark blogs");
    };
    let key : Types.BlogBookmark = { blogId = id; user = caller };
    if (blogBookmarks.contains(Types.compareBlogBookmark, key)) { return };
    blogBookmarks.add(Types.compareBlogBookmark, key);
  };

  // Remove a bookmark from a blog post. Requires authenticated User or Creator role.
  public shared ({ caller }) func unbookmarkBlog(id : Types.BlogId) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can unbookmark blogs");
    };
    let key : Types.BlogBookmark = { blogId = id; user = caller };
    blogBookmarks.remove(Types.compareBlogBookmark, key);
  };

  // Add a comment to a blog post (supports threading via parentCommentId).
  // Requires authenticated User or Creator role; author = caller.
  public shared ({ caller }) func addComment(
    blogId : Types.BlogId,
    parentCommentId : ?Types.CommentId,
    content : Text,
  ) : async Types.CommentView {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can comment");
    };
    switch (blogs.find(func(b) { b.id == blogId })) {
      case null { Runtime.trap("Blog not found") };
      case (?blog) {
        let id = nextCommentId.next;
        nextCommentId.next := nextCommentId.next + 1;
        let comment = BlogLib.createComment(id, blogId, caller, parentCommentId, content, Int.abs(Time.now()));
        comments.add(comment);
        // Notify the blog author (skip self-comments).
        if (blog.author != caller) {
          NotificationsLib.addNotification(
            notificationsByUser,
            nextNotificationId,
            blog.author,
            #comment,
            "Someone commented on your blog: " # blog.title,
            ?{ id = blogId; contentType = "blog" },
            Int.abs(Time.now()),
          );
        };
        BlogLib.toCommentView(comment);
      };
    };
  };

  // Delete a comment. Requires ownership.
  public shared ({ caller }) func deleteComment(id : Types.CommentId) : async () {
    switch (comments.find(func(c) { c.id == id })) {
      case null { Runtime.trap("Comment not found") };
      case (?comment) {
        if (comment.author != caller) {
          Runtime.trap("Unauthorized: Only the author can delete this comment");
        };
        let keptComments = comments.filter(func(c) { c.id != id });
        comments.clear();
        comments.addAll(keptComments.values());
        let keptCommentLikes = commentLikes.filter(Types.compareCommentLike, func(l) { l.commentId != id });
        commentLikes.clear();
        commentLikes.addAll(Types.compareCommentLike, keptCommentLikes.values());
      };
    };
  };

  // Like a comment. Requires authenticated User or Creator role.
  public shared ({ caller }) func likeComment(id : Types.CommentId) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can like comments");
    };
    let key : Types.CommentLike = { commentId = id; user = caller };
    if (commentLikes.contains(Types.compareCommentLike, key)) { return };
    commentLikes.add(Types.compareCommentLike, key);
    switch (comments.find(func(c) { c.id == id })) {
      case null { Runtime.trap("Comment not found") };
      case (?comment) {
        comment.likeCount := comment.likeCount + 1;
        // Notify the comment author (skip self-likes).
        if (comment.author != caller) {
          NotificationsLib.addNotification(
            notificationsByUser,
            nextNotificationId,
            comment.author,
            #like,
            "Someone liked your comment",
            ?{ id = id; contentType = "comment" },
            Int.abs(Time.now()),
          );
        };
      };
    };
  };

  // Get all comments for a blog post (public read).
  public query func getComments(blogId : Types.BlogId) : async [Types.CommentView] {
    let arr = comments.toArray();
    let filtered = arr.filter(func(c) { c.blogId == blogId });
    filtered.map(func(c) { BlogLib.toCommentView(c) });
  };
};

