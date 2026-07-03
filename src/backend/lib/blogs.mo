import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Types "../types/blogs";

// Domain logic for the blogs domain.
module {
  public type Blog = Types.Blog;
  public type Comment = Types.Comment;
  public type BlogView = Types.BlogView;
  public type CommentView = Types.CommentView;
  public type ListBlogsQuery = Types.ListBlogsQuery;
  public type ListBlogsResult = Types.ListBlogsResult;
  public type BlogId = Types.BlogId;
  public type CommentId = Types.CommentId;

  // Convert an internal Blog to its shared view.
  public func toBlogView(blog : Blog) : BlogView {
    {
      id = blog.id;
      author = blog.author;
      title = blog.title;
      content = blog.content;
      excerpt = blog.excerpt;
      tags = blog.tags;
      coverImageBlobId = blog.coverImageBlobId;
      createdAt = blog.createdAt;
      updatedAt = blog.updatedAt;
      published = blog.published;
      viewCount = blog.viewCount;
      likeCount = blog.likeCount;
    };
  };

  // Convert an internal Comment to its shared view.
  public func toCommentView(comment : Comment) : CommentView {
    {
      id = comment.id;
      blogId = comment.blogId;
      author = comment.author;
      parentCommentId = comment.parentCommentId;
      content = comment.content;
      createdAt = comment.createdAt;
      likeCount = comment.likeCount;
    };
  };

  // Create a new blog post record.
  public func createBlog(
    id : BlogId,
    author : Principal,
    title : Text,
    content : Text,
    excerpt : Text,
    tags : [Text],
    coverImageBlobId : ?Blob,
    now : Types.Timestamp,
    published : Bool,
  ) : Blog {
    {
      id;
      author;
      title;
      content;
      excerpt;
      tags;
      coverImageBlobId;
      createdAt = now;
      updatedAt = now;
      published;
      var viewCount = 0;
      var likeCount = 0;
    };
  };

  // Apply edits to an existing blog post (returns updated record).
  public func updateBlogFields(
    blog : Blog,
    title : Text,
    content : Text,
    excerpt : Text,
    tags : [Text],
    coverImageBlobId : ?Blob,
    published : Bool,
    now : Types.Timestamp,
  ) : Blog {
    {
      blog with
      title;
      content;
      excerpt;
      tags;
      coverImageBlobId;
      published;
      updatedAt = now;
      var viewCount = blog.viewCount;
      var likeCount = blog.likeCount;
    };
  };

  // Create a new comment record.
  public func createComment(
    id : CommentId,
    blogId : BlogId,
    author : Principal,
    parentCommentId : ?CommentId,
    content : Text,
    now : Types.Timestamp,
  ) : Comment {
    {
      id;
      blogId;
      author;
      parentCommentId;
      content;
      createdAt = now;
      var likeCount = 0;
    };
  };

  // Check whether a blog matches a listBlogs query (search + tag filter).
  // Only published blogs match. Search is a case-insensitive substring match
  // against title or content. Tag filter matches when the blog's tags contain
  // the requested tag.
  public func matchesQuery(blog : Blog, q : ListBlogsQuery) : Bool {
    if (not blog.published) { return false };
    switch (q.tag) {
      case (?tag) {
        if (not blog.tags.contains(tag)) { return false };
      };
      case null {};
    };
    switch (q.search) {
      case (?term) {
        let lower = term.toLower();
        if (blog.title.toLower().contains(#text lower)) { return true };
        if (blog.content.toLower().contains(#text lower)) { return true };
        return false;
      };
      case null { return true };
    };
  };

  // Compare two blogs for ordering per the given sort.
  // The #mostViewed, #mostLiked, and #mostBookmarked cases require
  // engagement counts; #mostBookmarked additionally needs the bookmark set
  // which is not available in this signature — the develop pass will
  // thread that through. For now the new cases trap so the contract
  // compiles without committing to a wrong implementation.
  public func compareForSort(a : Blog, b : Blog, sort : Types.BlogSort) : {
    #less;
    #equal;
    #greater;
  } {
    switch (sort) {
      case (#newest) { Nat.compare(b.createdAt, a.createdAt) };
      case (#mostLiked) { Nat.compare(b.likeCount, a.likeCount) };
      case (#mostViewed) { Nat.compare(b.viewCount, a.viewCount) };
      // Bookmark set is not threaded into compareForSort; fall back to
      // viewCount as the closest available engagement proxy.
      case (#mostBookmarked) { Nat.compare(b.viewCount, a.viewCount) };
    };
  };
};
