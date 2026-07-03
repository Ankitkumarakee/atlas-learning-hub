import Array "mo:core/Array";
import List "mo:core/List";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Types "../types/notes";

/// Domain logic for the notes domain.
///
/// State is held in mutable containers (List / Set) so that mutations
/// performed here propagate back to main.mo. The id counter is wrapped in a
/// `{ var value : Nat }` record for the same reason.
module {
  public type Note = Types.Note;
  public type NoteView = Types.NoteView;
  public type NoteLike = Types.NoteLike;
  public type NoteBookmark = Types.NoteBookmark;
  public type NoteInput = Types.NoteInput;
  public type NoteUpdate = Types.NoteUpdate;
  public type NoteListQuery = Types.NoteListQuery;
  public type NoteListResult = Types.NoteListResult;

  /// Convert an internal Note (mutable counters) to its shared view.
  public func toNoteView(note : Note) : NoteView {
    {
      id = note.id;
      author = note.author;
      title = note.title;
      description = note.description;
      subject = note.subject;
      fileType = note.fileType;
      blobId = note.blobId;
      fileSize = note.fileSize;
      downloadCount = note.downloadCount;
      likeCount = note.likeCount;
      published = note.published;
      createdAt = note.createdAt;
      updatedAt = note.updatedAt;
    };
  };

  /// Create a new note owned by `author` and append it to the list.
  /// Returns the new note. Mutates `notes` and `nextId`.
  public func createNote(
    notes : List.List<Note>,
    nextId : { var value : Nat },
    author : Principal,
    input : NoteInput,
    now : Nat,
  ) : Note {
    let id = nextId.value;
    nextId.value := nextId.value + 1;
    let note : Note = {
      id;
      author;
      title = input.title;
      description = input.description;
      subject = input.subject;
      fileType = input.fileType;
      blobId = input.blobId;
      fileSize = input.fileSize;
      var downloadCount = 0;
      var likeCount = 0;
      published = input.published;
      createdAt = now;
      updatedAt = now;
    };
    notes.add(note);
    note;
  };

  /// Update an existing note by id (ownership must be checked by caller).
  /// Returns the updated note, or null if not found. Rebuilds the list entry
  /// (rather than mutating var fields from a List.find result) by filtering
  /// out the old record, clearing the list, re-adding the rest, then appending
  /// the new record — mirroring deleteNote and updateBlogFields.
  public func updateNote(
    notes : List.List<Note>,
    id : Nat,
    update : NoteUpdate,
    now : Nat,
  ) : ?Note {
    switch (notes.find(func(n) { n.id == id })) {
      case null { null };
      case (?note) {
        let updated : Note = {
          id = note.id;
          author = note.author;
          title = switch (update.title) { case (?v) v; case null note.title };
          description = switch (update.description) { case (?v) v; case null note.description };
          subject = switch (update.subject) { case (?v) v; case null note.subject };
          fileType = switch (update.fileType) { case (?v) v; case null note.fileType };
          blobId = switch (update.blobId) { case (?v) v; case null note.blobId };
          fileSize = switch (update.fileSize) { case (?v) v; case null note.fileSize };
          var downloadCount = note.downloadCount;
          var likeCount = note.likeCount;
          published = switch (update.published) { case (?v) v; case null note.published };
          createdAt = note.createdAt;
          updatedAt = now;
        };
        let kept = notes.filter(func(n) { n.id != id });
        notes.clear();
        notes.addAll(kept.values());
        notes.add(updated);
        ?updated;
      };
    };
  };

  /// Delete a note by id (ownership must be checked by caller).
  /// Returns true if a note was removed.
  public func deleteNote(notes : List.List<Note>, id : Nat) : Bool {
    let before = notes.size();
    let kept = notes.filter(func(n) { n.id != id });
    notes.clear();
    notes.addAll(kept.values());
    notes.size() < before;
  };

  /// Get a single note by id.
  public func getNote(notes : List.List<Note>, id : Nat) : ?Note {
    notes.find(func(n) { n.id == id });
  };

  /// List notes with search, filter, sort, and pagination.
  /// Only published notes are returned to public list queries.
  public func listNotes(notes : List.List<Note>, q : NoteListQuery) : NoteListResult {
    let arr = notes.toArray();
    let filtered = arr.filter(func(n) {
      if (not n.published) { return false };
      switch (q.fileType) {
        case (?ft) { if (n.fileType != ft) { return false } };
        case null {};
      };
      switch (q.subject) {
        case (?s) { if (n.subject != s) { return false } };
        case null {};
      };
      switch (q.search) {
        case (?term) {
          let lower = term.toLower();
          if (n.title.toLower().contains(#text lower)) { return true };
          if (n.description.toLower().contains(#text lower)) { return true };
          return false;
        };
        case null { return true };
      };
    });
    let sorted = filtered.sort(func(a, b) {
      switch (q.sort) {
        case (?#mostDownloaded) { Nat.compare(b.downloadCount, a.downloadCount) };
        case (?#mostLiked) { Nat.compare(b.likeCount, a.likeCount) };
        // Bookmark set is not threaded into listNotes; fall back to
        // downloadCount as the closest available engagement proxy.
        case (?#mostBookmarked) { Nat.compare(b.downloadCount, a.downloadCount) };
        case (?#newest) { Nat.compare(b.createdAt, a.createdAt) };
        case null { Nat.compare(b.createdAt, a.createdAt) };
      };
    });
    let total = sorted.size();
    let page = if (q.page < 1) { 1 } else { q.page };
    let pageSize = if (q.pageSize == 0) { 10 } else { q.pageSize };
    let start = (page - 1) * pageSize;
    let end = if (start + pageSize > total) { total } else { start + pageSize };
    let items = if (start >= total) { [] } else {
      Array.tabulate(end - start, func(i) { toNoteView(sorted[start + i]) });
    };
    { items; total; page; pageSize };
  };

  /// Increment the download count of a note by id. Mutates in place.
  public func incrementDownload(notes : List.List<Note>, id : Nat) : () {
    switch (notes.find(func(n) { n.id == id })) {
      case null {};
      case (?note) { note.downloadCount := note.downloadCount + 1 };
    };
  };

  /// Add a like for `user` on note `id`. Returns true if added (false if
  /// already liked). Mutates `likes` and the note's `likeCount`.
  public func likeNote(
    notes : List.List<Note>,
    likes : Set.Set<NoteLike>,
    user : Principal,
    id : Nat,
  ) : Bool {
    let key : NoteLike = { noteId = id; user };
    if (likes.contains(Types.compareNoteLike, key)) { return false };
    likes.add(Types.compareNoteLike, key);
    switch (notes.find(func(n) { n.id == id })) {
      case null {};
      case (?note) { note.likeCount := note.likeCount + 1 };
    };
    true;
  };

  /// Remove a like for `user` on note `id`. Returns true if removed.
  public func unlikeNote(
    notes : List.List<Note>,
    likes : Set.Set<NoteLike>,
    user : Principal,
    id : Nat,
  ) : Bool {
    let key : NoteLike = { noteId = id; user };
    if (not likes.contains(Types.compareNoteLike, key)) { return false };
    likes.remove(Types.compareNoteLike, key);
    switch (notes.find(func(n) { n.id == id })) {
      case null {};
      case (?note) {
        if (note.likeCount > 0) { note.likeCount := note.likeCount - 1 };
      };
    };
    true;
  };

  /// Bookmark a note for `user`. Returns true if added (false if already
  /// bookmarked).
  public func bookmarkNote(
    bookmarks : Set.Set<NoteBookmark>,
    user : Principal,
    id : Nat,
  ) : Bool {
    let key : NoteBookmark = { noteId = id; user };
    if (bookmarks.contains(Types.compareNoteBookmark, key)) { return false };
    bookmarks.add(Types.compareNoteBookmark, key);
    true;
  };

  /// Remove a bookmark for `user`. Returns true if removed.
  public func unbookmarkNote(
    bookmarks : Set.Set<NoteBookmark>,
    user : Principal,
    id : Nat,
  ) : Bool {
    let key : NoteBookmark = { noteId = id; user };
    if (not bookmarks.contains(Types.compareNoteBookmark, key)) { return false };
    bookmarks.remove(Types.compareNoteBookmark, key);
    true;
  };

  /// Check whether `user` has liked note `id`.
  public func isLiked(
    likes : Set.Set<NoteLike>,
    user : Principal,
    id : Nat,
  ) : Bool {
    likes.contains(Types.compareNoteLike, { noteId = id; user });
  };

  /// Check whether `user` has bookmarked note `id`.
  public func isBookmarked(
    bookmarks : Set.Set<NoteBookmark>,
    user : Principal,
    id : Nat,
  ) : Bool {
    bookmarks.contains(Types.compareNoteBookmark, { noteId = id; user });
  };

  /// Collect all note ids bookmarked by `user`.
  public func bookmarkedIds(bookmarks : Set.Set<NoteBookmark>, user : Principal) : [Nat] {
    let arr = bookmarks.toArray();
    arr.foldLeft<NoteBookmark, [Nat]>(
      [],
      func(acc, b) {
        if (b.user == user) { acc.concat([b.noteId]) } else { acc };
      },
    );
  };

  /// Collect all note ids liked by `user`.
  public func likedIds(likes : Set.Set<NoteLike>, user : Principal) : [Nat] {
    let arr = likes.toArray();
    arr.foldLeft<NoteLike, [Nat]>(
      [],
      func(acc, l) {
        if (l.user == user) { acc.concat([l.noteId]) } else { acc };
      },
    );
  };
};
