module {
  /// A single content recommendation result returned by the discovery domain.
  /// Reuses the cross-cutting ContentType / ContentRef from types/common.mo
  /// but adds a relevance score so callers can re-rank or threshold.
  public type Recommendation = {
    contentRef : {
      id : Nat;
      contentType : {
        #blog;
        #note;
        #video;
      };
      title : Text;
      author : Principal;
    };
    score : Float; // higher = more relevant; exact semantics set by lib
    reason : Text; // short human-readable explanation of why it was picked
  };

  /// A trending content item returned by getTrending.
  /// Carries the content reference plus the engagement signal used to rank it.
  public type TrendingItem = {
    contentRef : {
      id : Nat;
      contentType : {
        #blog;
        #note;
        #video;
      };
      title : Text;
      author : Principal;
    };
    score : Float; // trending score; higher = hotter
    views : Nat;
    likes : Nat;
  };
};
