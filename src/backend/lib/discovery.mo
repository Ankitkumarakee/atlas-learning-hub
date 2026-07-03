import Array "mo:core/Array";
import Float "mo:core/Float";
import List "mo:core/List";
import Nat "mo:core/Nat";
import BlogTypes "../types/blogs";
import NoteTypes "../types/notes";
import VideoTypes "../types/videos";
import DiscoveryTypes "../types/discovery";
import Videos "../lib/videos";

// Domain logic for the discovery domain (related-content + trending).
//
// This module is stateless: every function takes the live stable stores it
// needs as explicit parameters. The mixins/discovery-api.mo mixin is the
// thin public wrapper that injects state and delegates here.
module {
  public type ContentType = {
    #blog;
    #note;
    #video;
  };

  public type ContentRef = {
    id : Nat;
    contentType : ContentType;
    title : Text;
    author : Principal;
  };

  // Build a ContentRef from a blog.
  func blogRef(blog : BlogTypes.Blog) : ContentRef = {
    id = blog.id;
    contentType = #blog;
    title = blog.title;
    author = blog.author;
  };

  // Build a ContentRef from a note.
  func noteRef(note : NoteTypes.Note) : ContentRef = {
    id = note.id;
    contentType = #note;
    title = note.title;
    author = note.author;
  };

  // Build a ContentRef from a video.
  func videoRef(video : VideoTypes.Video) : ContentRef = {
    id = video.id;
    contentType = #video;
    title = video.title;
    author = video.author;
  };

  // Count how many elements of `a` also appear in `b` (set intersection size).
  func overlap(a : [Text], b : [Text]) : Nat {
    a.foldLeft(
      0,
      func(acc, tag) {
        if (b.contains(tag)) { acc + 1 } else { acc };
      },
    );
  };

  /// Return up to `limit` content items related to the given content.
  /// Scores by shared tags (blogs), category (videos), or subject/fileType
  /// (notes). Excludes the source item itself. Only published content is
  /// considered.
  public func getRelatedContent(
    blogs : List.List<BlogTypes.Blog>,
    notes : List.List<NoteTypes.Note>,
    videoStore : Videos.VideoStore,
    contentType : ContentType,
    contentId : Nat,
    limit : Nat,
  ) : [DiscoveryTypes.Recommendation] {
    // Resolve the source item and its matching signal, then collect
    // candidates of the same content type.
    let candidates : [DiscoveryTypes.Recommendation] = switch (contentType) {
      case (#blog) {
        switch (blogs.find(func(b) { b.id == contentId and b.published })) {
          case null { [] };
          case (?source) {
            let arr = blogs.toArray();
            arr.filter(func(b) {
              b.published and b.id != contentId;
            })
            .map(func(b) {
              let sharedCount = overlap(source.tags, b.tags);
              {
                contentRef = blogRef(b);
                score = Float.fromInt(sharedCount);
                reason = if (sharedCount > 0) { "Shared tags" } else { "Same type" };
              };
            });
          };
        };
      };
      case (#note) {
        switch (notes.find(func(n) { n.id == contentId and n.published })) {
          case null { [] };
          case (?source) {
            let arr = notes.toArray();
            arr.filter(func(n) {
              n.published and n.id != contentId;
            })
            .map(func(n) {
              let sameSubject = if (n.subject == source.subject) { 1 } else { 0 };
              let sameFileType = if (n.fileType == source.fileType) { 1 } else { 0 };
              let score = sameSubject * 2 + sameFileType;
              {
                contentRef = noteRef(n);
                score = Float.fromInt(score);
                reason = if (sameSubject > 0) { "Same subject" } else if (sameFileType > 0) { "Same file type" } else { "Same type" };
              };
            });
          };
        };
      };
      case (#video) {
        switch (videoStore.videos.get(contentId)) {
          case null { [] };
          case (?source) {
            if (not source.published) { [] } else {
              let arr = videoStore.videos.toArray();
              arr.filter(func(_, v) {
                v.published and v.id != contentId;
              })
              .map(func(_, v) {
                let sameCategory = if (v.category == source.category) { 1 } else { 0 };
                {
                  contentRef = videoRef(v);
                  score = Float.fromInt(sameCategory);
                  reason = if (sameCategory > 0) { "Same category" } else { "Same type" };
                };
              });
            };
          };
        };
      };
    };

    // Sort by score descending, then take top `limit`.
    let sorted = candidates.sort(
      func(a, b) { Float.compare(b.score, a.score) },
    );
    let total = sorted.size();
    let take = if (limit < total) { limit } else { total };
    Array.tabulate(take, func(i) { sorted[i] });
  };

  /// Return up to `limit` trending content items across all content types,
  /// ranked by a blended engagement score (views + likes + bookmarks).
  /// Only published content is considered.
  public func getTrending(
    blogs : List.List<BlogTypes.Blog>,
    notes : List.List<NoteTypes.Note>,
    videoStore : Videos.VideoStore,
    limit : Nat,
  ) : [DiscoveryTypes.TrendingItem] {
    // Blog trending entries.
    let blogArr = blogs.toArray();
    let blogItems = blogArr.filter(func(b) { b.published })
      .map(func(b) {
        let views = b.viewCount;
        let likes = b.likeCount;
        // Bookmarks not directly available on the blog record; the
        // discovery domain only receives the blog list, so we score by
        // views + likes only for blogs.
        let score = Float.fromInt(views + likes);
        {
          contentRef = blogRef(b);
          score;
          views;
          likes;
        };
      });

    // Note trending entries.
    let noteArr = notes.toArray();
    let noteItems = noteArr.filter(func(n) { n.published })
      .map(func(n) {
        let views = n.downloadCount;
        let likes = n.likeCount;
        let score = Float.fromInt(views + likes);
        {
          contentRef = noteRef(n);
          score;
          views;
          likes;
        };
      });

    // Video trending entries.
    let videoArr = videoStore.videos.toArray();
    let videoItems = videoArr.filter(func(entry) { entry.1.published })
      .map(func(entry) {
        let v = entry.1;
        let views = v.viewCount;
        let likes = v.likeCount;
        let score = Float.fromInt(views + likes);
        {
          contentRef = videoRef(v);
          score;
          views;
          likes;
        };
      });

    // Combine and sort by score descending.
    let all = blogItems.concat(noteItems).concat(videoItems);
    let sorted = all.sort(
      func(a, b) { Float.compare(b.score, a.score) },
    );
    let total = sorted.size();
    let take = if (limit < total) { limit } else { total };
    Array.tabulate(take, func(i) { sorted[i] });
  };
};
