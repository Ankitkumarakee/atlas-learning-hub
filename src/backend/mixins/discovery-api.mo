import List "mo:core/List";
import BlogTypes "../types/blogs";
import NoteTypes "../types/notes";
import VideoTypes "../types/videos";
import DiscoveryTypes "../types/discovery";
import Videos "../lib/videos";
import DiscoveryLib "../lib/discovery";

// Public API surface for the discovery domain (recommendations + trending).
//
// State injected via the mixin parameter (read-only aggregation over other
// domains — the discovery domain owns no stable state of its own):
//   blogs      : List.List<BlogTypes.Blog>   -- content source
//   notes      : List.List<NoteTypes.Note>   -- content source
//   videoStore : Videos.VideoStore            -- content source
//
// Both endpoints are public query reads — no caller authorization required
// since they only surface already-published content.
mixin (
  blogs : List.List<BlogTypes.Blog>,
  notes : List.List<NoteTypes.Note>,
  videoStore : Videos.VideoStore,
) {
  /// Return up to `limit` content items related to the given content.
  /// Public read — surfaces only published content.
  public query func getRelatedContent(
    contentType : {
      #blog;
      #note;
      #video;
    },
    contentId : Nat,
    limit : Nat,
  ) : async [DiscoveryTypes.Recommendation] {
    DiscoveryLib.getRelatedContent(blogs, notes, videoStore, contentType, contentId, limit);
  };

  /// Return up to `limit` trending content items across all content types.
  /// Public read — surfaces only published content.
  public query func getTrending(limit : Nat) : async [DiscoveryTypes.TrendingItem] {
    DiscoveryLib.getTrending(blogs, notes, videoStore, limit);
  };
};
