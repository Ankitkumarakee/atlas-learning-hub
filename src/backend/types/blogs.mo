import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Principal "mo:core/Principal";

module {
  // Cross-cutting shared types used by the blogs domain.
  public type BlogId = Nat;
  public type CommentId = Nat;
  public type Timestamp = Nat; // nanoseconds since epoch (Time.now())

  // A blog post. Internal stable record (mutable counters).
  public type Blog = {
    id : BlogId;
    author : Principal;
    title : Text;
    content : Text; // rich text HTML string
    excerpt : Text;
    tags : [Text];
    coverImageBlobId : ?Blob; // object-storage blob id for cover image
    createdAt : Timestamp;
    updatedAt : Timestamp;
    published : Bool;
    var viewCount : Nat;
    var likeCount : Nat;
  };

  // A comment on a blog post, supports threading via parentCommentId.
  public type Comment = {
    id : CommentId;
    blogId : BlogId;
    author : Principal;
    parentCommentId : ?CommentId; // null for top-level comments
    content : Text;
    createdAt : Timestamp;
    var likeCount : Nat;
  };

  // Per-user like tracking keyed by principal.
  public type BlogLike = {
    blogId : BlogId;
    user : Principal;
  };

  // Per-user bookmark tracking keyed by principal.
  public type BlogBookmark = {
    blogId : BlogId;
    user : Principal;
  };

  // Per-user comment like tracking keyed by principal.
  public type CommentLike = {
    commentId : CommentId;
    user : Principal;
  };

  // Compare functions for Set operations. Compare by content id first via
  // Nat.compare, then by user via Principal.compare.
  public func compareBlogLike(a : BlogLike, b : BlogLike) : Order.Order {
    switch (Nat.compare(a.blogId, b.blogId)) {
      case (#equal) { Principal.compare(a.user, b.user) };
      case order { order };
    };
  };

  public func compareBlogBookmark(a : BlogBookmark, b : BlogBookmark) : Order.Order {
    switch (Nat.compare(a.blogId, b.blogId)) {
      case (#equal) { Principal.compare(a.user, b.user) };
      case order { order };
    };
  };

  public func compareCommentLike(a : CommentLike, b : CommentLike) : Order.Order {
    switch (Nat.compare(a.commentId, b.commentId)) {
      case (#equal) { Principal.compare(a.user, b.user) };
      case order { order };
    };
  };

  // Shared (serializable) view of a blog for the API boundary.
  public type BlogView = {
    id : BlogId;
    author : Principal;
    title : Text;
    content : Text;
    excerpt : Text;
    tags : [Text];
    coverImageBlobId : ?Blob;
    createdAt : Timestamp;
    updatedAt : Timestamp;
    published : Bool;
    viewCount : Nat;
    likeCount : Nat;
  };

  // Shared (serializable) view of a comment for the API boundary.
  public type CommentView = {
    id : CommentId;
    blogId : BlogId;
    author : Principal;
    parentCommentId : ?CommentId;
    content : Text;
    createdAt : Timestamp;
    likeCount : Nat;
  };

  // Sort options for listBlogs.
  public type BlogSort = {
    #newest;
    #mostLiked;
    #mostViewed;
    #mostBookmarked;
  };

  // Filter + pagination input for listBlogs.
  public type ListBlogsQuery = {
    search : ?Text; // search by title/content
    tag : ?Text; // filter by tag
    sort : BlogSort;
    page : Nat; // 1-indexed
    pageSize : Nat;
  };

  // Paginated result for listBlogs.
  public type ListBlogsResult = {
    items : [BlogView];
    total : Nat;
    page : Nat;
    pageSize : Nat;
  };
};
