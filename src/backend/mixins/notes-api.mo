import List "mo:core/List";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Int "mo:core/Int";
import AccessControl "mo:caffeineai-authorization/access-control";
import Types "../types/notes";
import NotificationTypes "../types/notifications";
import NoteLib "../lib/notes";
import NotificationsLib "../lib/notifications";

// Public API surface for the notes domain.
//
// State injected via the mixin parameter:
//   notes          : List.List<Types.Note>          -- all note documents
//   nextNoteId     : { var value : Nat }            -- note id counter
//   noteLikes      : Set.Set<Types.NoteLike>        -- per-user note likes
//   noteBookmarks  : Set.Set<Types.NoteBookmark>    -- per-user bookmarks
//   accessControlState : AccessControl.AccessControlState -- for role checks
//   notificationsByUser : Map.Map<Principal, List.List<NotificationTypes.Notification>>
//   nextNotificationId : { var value : Nat }        -- notification id counter
mixin (
  notes : List.List<Types.Note>,
  nextNoteId : { var value : Nat },
  noteLikes : Set.Set<Types.NoteLike>,
  noteBookmarks : Set.Set<Types.NoteBookmark>,
  accessControlState : AccessControl.AccessControlState,
  notificationsByUser : Map.Map<Principal, List.List<NotificationTypes.Notification>>,
  nextNotificationId : { var value : Nat },
) {
  /// Create a new note. Requires authenticated User or Creator role; caller becomes author.
  public shared ({ caller }) func createNote(input : Types.NoteInput) : async Types.NoteView {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can create notes");
    };
    NoteLib.toNoteView(NoteLib.createNote(notes, nextNoteId, caller, input, Int.abs(Time.now())));
  };

  /// Update an existing note. Requires ownership.
  public shared ({ caller }) func updateNote(id : Nat, update : Types.NoteUpdate) : async Types.NoteView {
    switch (NoteLib.getNote(notes, id)) {
      case null { Runtime.trap("Note not found") };
      case (?note) {
        if (note.author != caller) {
          Runtime.trap("Unauthorized: Only the author can update this note");
        };
        switch (NoteLib.updateNote(notes, id, update, Int.abs(Time.now()))) {
          case null { Runtime.trap("Note not found") };
          case (?updated) { NoteLib.toNoteView(updated) };
        };
      };
    };
  };

  /// Delete a note. Requires ownership.
  public shared ({ caller }) func deleteNote(id : Nat) : async () {
    switch (NoteLib.getNote(notes, id)) {
      case null { Runtime.trap("Note not found") };
      case (?note) {
        if (note.author != caller) {
          Runtime.trap("Unauthorized: Only the author can delete this note");
        };
        let _ = NoteLib.deleteNote(notes, id);
        // Clean up likes/bookmarks for this note.
        let keptLikes = noteLikes.filter(Types.compareNoteLike, func(l) { l.noteId != id });
        noteLikes.clear();
        noteLikes.addAll(Types.compareNoteLike, keptLikes.values());
        let keptBookmarks = noteBookmarks.filter(Types.compareNoteBookmark, func(b) { b.noteId != id });
        noteBookmarks.clear();
        noteBookmarks.addAll(Types.compareNoteBookmark, keptBookmarks.values());
      };
    };
  };

  /// Get a single note by id (public read).
  public query func getNote(id : Nat) : async ?Types.NoteView {
    switch (NoteLib.getNote(notes, id)) {
      case null { null };
      case (?note) { ?NoteLib.toNoteView(note) };
    };
  };

  /// List notes with search, filter, sort, and pagination (public read).
  public query func listNotes(q : Types.NoteListQuery) : async Types.NoteListResult {
    NoteLib.listNotes(notes, q);
  };

  /// Like a note. Requires authenticated User or Creator role.
  public shared ({ caller }) func likeNote(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can like notes");
    };
    let added = NoteLib.likeNote(notes, noteLikes, caller, id);
    if (added) {
      // Notify the note author (skip self-likes).
      switch (NoteLib.getNote(notes, id)) {
        case null {};
        case (?note) {
          if (note.author != caller) {
            NotificationsLib.addNotification(
              notificationsByUser,
              nextNotificationId,
              note.author,
              #like,
              "Someone liked your note: " # note.title,
              ?{ id = id; contentType = "note" },
              Int.abs(Time.now()),
            );
          };
        };
      };
    };
  };

  /// Remove a like from a note. Requires authenticated User or Creator role.
  public shared ({ caller }) func unlikeNote(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can unlike notes");
    };
    let _ = NoteLib.unlikeNote(notes, noteLikes, caller, id);
  };

  /// Bookmark a note. Requires authenticated User or Creator role.
  public shared ({ caller }) func bookmarkNote(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can bookmark notes");
    };
    let _ = NoteLib.bookmarkNote(noteBookmarks, caller, id);
  };

  /// Remove a bookmark. Requires authenticated User or Creator role.
  public shared ({ caller }) func unbookmarkNote(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can unbookmark notes");
    };
    let _ = NoteLib.unbookmarkNote(noteBookmarks, caller, id);
  };

  /// Increment the download counter for a note.
  public shared func incrementDownload(id : Nat) : async () {
    NoteLib.incrementDownload(notes, id);
  };
};
