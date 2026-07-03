import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Principal "mo:core/Principal";

module {
  /// File type of an uploaded note document.
  public type NoteFileType = {
    #pdf;
    #docx;
    #ppt;
    #zip;
  };

  /// Sort order for listNotes.
  public type NoteSort = {
    #newest;
    #mostDownloaded;
  };

  /// A note document uploaded by a creator. Internal stable record with
  /// mutable counters so view/like/download updates can mutate in place.
  public type Note = {
    id : Nat;
    author : Principal;
    title : Text;
    description : Text;
    subject : Text;
    fileType : NoteFileType;
    /// Object-storage blob id referencing the uploaded file.
    blobId : Text;
    fileSize : Nat;
    var downloadCount : Nat;
    var likeCount : Nat;
    published : Bool;
    createdAt : Nat;
    updatedAt : Nat;
  };

  /// Per-user like tracking keyed by (noteId, user).
  public type NoteLike = {
    noteId : Nat;
    user : Principal;
  };

  /// Per-user bookmark tracking keyed by (noteId, user).
  public type NoteBookmark = {
    noteId : Nat;
    user : Principal;
  };

  // Compare functions for Set operations. Compare by noteId first via
  // Nat.compare, then by user via Principal.compare.
  public func compareNoteLike(a : NoteLike, b : NoteLike) : Order.Order {
    switch (Nat.compare(a.noteId, b.noteId)) {
      case (#equal) { Principal.compare(a.user, b.user) };
      case order { order };
    };
  };

  public func compareNoteBookmark(a : NoteBookmark, b : NoteBookmark) : Order.Order {
    switch (Nat.compare(a.noteId, b.noteId)) {
      case (#equal) { Principal.compare(a.user, b.user) };
      case order { order };
    };
  };

  /// Input payload for creating a note.
  public type NoteInput = {
    title : Text;
    description : Text;
    subject : Text;
    fileType : NoteFileType;
    blobId : Text;
    fileSize : Nat;
    published : Bool;
  };

  /// Input payload for updating a note.
  public type NoteUpdate = {
    title : ?Text;
    description : ?Text;
    subject : ?Text;
    fileType : ?NoteFileType;
    blobId : ?Text;
    fileSize : ?Nat;
    published : ?Bool;
  };

  /// Shared (serializable) view of a note for the API boundary. The internal
  /// `Note` record carries mutable counters (`var downloadCount`, `var
  /// likeCount`) which make it non-shared; this immutable view is what public
  /// query/update functions return.
  public type NoteView = {
    id : Nat;
    author : Principal;
    title : Text;
    description : Text;
    subject : Text;
    fileType : NoteFileType;
    blobId : Text;
    fileSize : Nat;
    downloadCount : Nat;
    likeCount : Nat;
    published : Bool;
    createdAt : Nat;
    updatedAt : Nat;
  };

  /// Filter + search + pagination for listNotes.
  public type NoteListQuery = {
    search : ?Text;
    fileType : ?NoteFileType;
    subject : ?Text;
    sort : ?NoteSort;
    page : Nat;
    pageSize : Nat;
  };

  /// Paginated result of listNotes.
  public type NoteListResult = {
    items : [NoteView];
    total : Nat;
    page : Nat;
    pageSize : Nat;
  };
};
