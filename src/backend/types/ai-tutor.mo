module {
  // Cross-cutting types reused from the platform. Inlined here so this domain
  // module is self-contained for type-checking.
  public type UserId = Principal;
  public type Timestamp = Nat;

  // A role within a chat conversation.
  public type MessageRole = {
    #user;
    #assistant;
  };

  // The kind of platform content a RAG source reference points to.
  public type SourceType = {
    #blog;
    #note;
    #video;
  };

  // A reference to a piece of platform content used as RAG context for an
  // assistant message. Carries enough info for the UI to render a citation.
  public type SourceReference = {
    contentId : Nat;
    sourceType : SourceType;
    title : Text;
  };

  // A single message in a conversation.
  public type Message = {
    id : Nat;
    conversationId : Nat;
    role : MessageRole;
    content : Text;
    sources : [SourceReference];
    createdAt : Timestamp;
  };

  // A conversation between a user and the AI tutor.
  public type Conversation = {
    id : Nat;
    user : UserId;
    title : Text;
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  // Result returned by sendMessage: the stored assistant message plus the
  // source citations used to build the RAG context.
  public type SendMessageResult = {
    message : Message;
    sources : [SourceReference];
  };
};
