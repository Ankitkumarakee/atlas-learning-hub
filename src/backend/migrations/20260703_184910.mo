import Map "mo:core/Map";
import List "mo:core/List";
import Set "mo:core/Set";
import Principal "mo:core/Principal";

// Initial migration for the Atlas Learning Hub backend canister.
//
// This is the first entry in the migration chain, so OldActor = {} (fresh
// install). NewActor enumerates every stable field declared in main.mo and
// supplies its initial value. All types are inlined here so the migration
// remains self-contained and replays correctly forever.
module {
  // -------------------------------------------------------------------------
  // Inlined types (must match the definitions in types/*.mo and lib/videos.mo)
  // -------------------------------------------------------------------------

  type Timestamp = Nat;

  type Blog = {
    id : Nat;
    author : Principal;
    title : Text;
    content : Text;
    excerpt : Text;
    tags : [Text];
    coverImageBlobId : ?Blob;
    createdAt : Timestamp;
    updatedAt : Timestamp;
    published : Bool;
    var viewCount : Nat;
    var likeCount : Nat;
  };

  type Comment = {
    id : Nat;
    blogId : Nat;
    author : Principal;
    parentCommentId : ?Nat;
    content : Text;
    createdAt : Timestamp;
    var likeCount : Nat;
  };

  type BlogLike = { blogId : Nat; user : Principal };
  type BlogBookmark = { blogId : Nat; user : Principal };
  type CommentLike = { commentId : Nat; user : Principal };

  type NoteFileType = { #pdf; #docx; #ppt; #zip };

  type Note = {
    id : Nat;
    author : Principal;
    title : Text;
    description : Text;
    subject : Text;
    fileType : NoteFileType;
    blobId : Text;
    fileSize : Nat;
    var downloadCount : Nat;
    var likeCount : Nat;
    published : Bool;
    createdAt : Nat;
    updatedAt : Nat;
  };

  type NoteLike = { noteId : Nat; user : Principal };
  type NoteBookmark = { noteId : Nat; user : Principal };

  type Video = {
    id : Nat;
    author : Principal;
    title : Text;
    description : Text;
    category : Text;
    isShort : Bool;
    videoBlobId : Text;
    thumbnailBlobId : Text;
    durationSeconds : Nat;
    viewCount : Nat;
    likeCount : Nat;
    published : Bool;
    createdAt : Int;
    updatedAt : Int;
  };

  type VideoStore = {
    videos : Map.Map<Nat, Video>;
    nextId : { var value : Nat };
    likes : Map.Map<Nat, Set.Set<Principal>>;
    bookmarks : Map.Map<Principal, Set.Set<Nat>>;
    viewedSessions : Map.Map<Text, ()>;
  };

  type NotificationType = {
    #like;
    #comment;
    #roleUpgrade;
    #moderation;
    #systemMessage;
  };

  type SourceContent = { id : Nat; contentType : Text };

  type Notification = {
    id : Nat;
    recipient : Principal;
    notificationType : NotificationType;
    content : Text;
    source : ?SourceContent;
    createdAt : Timestamp;
    var read : Bool;
  };

  type Conversation = {
    id : Nat;
    user : Principal;
    title : Text;
    createdAt : Nat;
    updatedAt : Nat;
  };

  type MessageRole = { #user; #assistant };

  type SourceType = { #blog; #note; #video };

  type SourceReference = {
    contentId : Nat;
    sourceType : SourceType;
    title : Text;
  };

  type Message = {
    id : Nat;
    conversationId : Nat;
    role : MessageRole;
    content : Text;
    sources : [SourceReference];
    createdAt : Nat;
  };

  type UserRole = { #admin; #user; #guest };

  type AccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, UserRole>;
  };

  // -------------------------------------------------------------------------
  // Migration: fresh install — OldActor is empty.
  // -------------------------------------------------------------------------
  type OldActor = {};
  type NewActor = {
    accessControlState : AccessControlState;
    blogs : List.List<Blog>;
    comments : List.List<Comment>;
    blogLikes : Set.Set<BlogLike>;
    blogBookmarks : Set.Set<BlogBookmark>;
    commentLikes : Set.Set<CommentLike>;
    nextBlogId : { var next : Nat };
    nextCommentId : { var next : Nat };
    notes : List.List<Note>;
    nextNoteId : { var value : Nat };
    noteLikes : Set.Set<NoteLike>;
    noteBookmarks : Set.Set<NoteBookmark>;
    videoStore : VideoStore;
    conversations : List.List<Conversation>;
    messages : List.List<Message>;
    nextConversationId : { var value : Nat };
    nextMessageId : { var value : Nat };
    notificationsByUser : Map.Map<Principal, List.List<Notification>>;
    nextNotificationId : { var value : Nat };
  };

  public func migration(old : OldActor) : NewActor {
    {
      accessControlState = {
        var adminAssigned = false;
        userRoles = Map.empty();
      };
      blogs = List.empty();
      comments = List.empty();
      blogLikes = Set.empty();
      blogBookmarks = Set.empty();
      commentLikes = Set.empty();
      nextBlogId = { var next = 0 };
      nextCommentId = { var next = 0 };
      notes = List.empty();
      nextNoteId = { var value = 0 };
      noteLikes = Set.empty();
      noteBookmarks = Set.empty();
      videoStore = {
        videos = Map.empty();
        nextId = { var value = 0 };
        likes = Map.empty();
        bookmarks = Map.empty();
        viewedSessions = Map.empty();
      };
      conversations = List.empty();
      messages = List.empty();
      nextConversationId = { var value = 0 };
      nextMessageId = { var value = 0 };
      notificationsByUser = Map.empty();
      nextNotificationId = { var value = 0 };
    };
  };
};
