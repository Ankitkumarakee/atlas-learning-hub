module {
  /// Cross-cutting timestamp type used across all domains.
  /// Nanoseconds since epoch (matches Time.now()).
  public type Timestamp = Nat;

  /// Discriminator for the kind of platform content a reference points to.
  /// Shared by dashboards, AI tutor source citations, and notifications.
  public type ContentType = {
    #blog;
    #note;
    #video;
  };

  /// A reference to a piece of platform content of any supported type.
  /// Used by dashboards (bookmark lists, moderation queue) and by the
  /// AI tutor (RAG source citations).
  public type ContentRef = {
    id : Nat;
    contentType : ContentType;
    title : Text;
    author : Principal;
  };

  /// Generic pagination input shared by list endpoints across domains.
  public type PageQuery = {
    page : Nat; // 1-indexed
    pageSize : Nat;
  };

  /// Generic paginated result shared by list endpoints across domains.
  public type PageResult<T> = {
    items : [T];
    total : Nat;
    page : Nat;
    pageSize : Nat;
  };
};
