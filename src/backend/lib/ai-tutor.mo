import Array "mo:core/Array";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Types "../types/ai-tutor";

module {
  public type Conversation = Types.Conversation;
  public type Message = Types.Message;
  public type MessageRole = Types.MessageRole;
  public type SendMessageResult = Types.SendMessageResult;
  public type SourceReference = Types.SourceReference;
  public type SourceType = Types.SourceType;
  public type UserId = Types.UserId;

  /// A candidate RAG source: enough text to embed/match plus metadata for the
  /// citation. Built by the caller from blogs/notes/videos stores.
  public type RagCandidate = {
    contentId : Nat;
    sourceType : SourceType;
    title : Text;
    body : Text;
    author : Principal;
  };

  /// Create a new conversation for the given user.
  public func createConversation(
    conversations : List.List<Conversation>,
    nextConversationId : { var value : Nat },
    user : UserId,
    title : Text,
    now : Types.Timestamp,
  ) : Conversation {
    let id = nextConversationId.value;
    nextConversationId.value := nextConversationId.value + 1;
    let convo : Conversation = {
      id;
      user;
      title;
      createdAt = now;
      updatedAt = now;
    };
    conversations.add(convo);
    convo;
  };

  /// Delete a conversation and all of its messages. Returns true if a
  /// conversation was removed.
  public func deleteConversation(
    conversations : List.List<Conversation>,
    messages : List.List<Message>,
    conversationId : Nat,
  ) : Bool {
    let before = conversations.size();
    let kept = conversations.filter(func(c) { c.id != conversationId });
    let removed = kept.size() < before;
    if (removed) {
      conversations.clear();
      conversations.addAll(kept.values());
      let keptMsgs = messages.filter(func(m) { m.conversationId != conversationId });
      messages.clear();
      messages.addAll(keptMsgs.values());
    };
    removed;
  };

  /// List all conversations belonging to the given user, newest first.
  public func listConversations(conversations : List.List<Conversation>, user : UserId) : [Conversation] {
    let arr = conversations.toArray();
    let filtered = arr.filter(func(c) { c.user == user });
    filtered.sort(func(a, b) {
      Nat.compare(b.updatedAt, a.updatedAt);
    });
  };

  /// List all messages in a conversation in chronological order.
  public func getMessages(messages : List.List<Message>, conversationId : Nat) : [Message] {
    let arr = messages.toArray();
    let filtered = arr.filter(func(m) { m.conversationId == conversationId });
    filtered.sort(func(a, b) {
      Nat.compare(a.createdAt, b.createdAt);
    });
  };

  /// Find a conversation by id.
  public func findConversation(
    conversations : List.List<Conversation>,
    conversationId : Nat,
  ) : ?Conversation {
    conversations.find(func(c) { c.id == conversationId });
  };

  /// Append a message to the messages list and return it.
  public func appendMessage(
    messages : List.List<Message>,
    nextMessageId : { var value : Nat },
    conversationId : Nat,
    role : MessageRole,
    content : Text,
    sources : [SourceReference],
    now : Types.Timestamp,
  ) : Message {
    let id = nextMessageId.value;
    nextMessageId.value := nextMessageId.value + 1;
    let msg : Message = {
      id;
      conversationId;
      role;
      content;
      sources;
      createdAt = now;
    };
    messages.add(msg);
    msg;
  };

  /// Touch a conversation's `updatedAt`. Since `Conversation` is immutable
  /// (it is a shared type returned by public methods), we find the conversation,
  /// remove it from the list, and re-add an updated immutable copy built with
  /// record spread.
  public func touchConversation(
    conversations : List.List<Conversation>,
    conversationId : Nat,
    now : Types.Timestamp,
  ) : () {
    switch (conversations.find(func(c) { c.id == conversationId })) {
      case null {};
      case (?convo) {
        let updated : Conversation = { convo with updatedAt = now };
        let kept = conversations.filter(func(c) { c.id != conversationId });
        conversations.clear();
        conversations.addAll(kept.values());
        conversations.add(updated);
      };
    };
  };

  /// Build the RAG context from a list of candidate sources. Selects up to
  /// `maxSources` candidates whose body shares any token with the question,
  /// falling back to the first candidates if none match. Returns the selected
  /// source references and a concatenated context string.
  public func buildRagContext(
    candidates : [RagCandidate],
    question : Text,
    maxSources : Nat,
  ) : ([SourceReference], Text) {
    let qLower = question.toLower();
    let qTokens = qLower.split(#char ' ').toArray().filter(func(t) { t.size() > 2 });
    let scored = candidates.map(func(c) {
      let bodyLower = c.body.toLower();
      let score = qTokens.foldLeft(
        0,
        func(acc, token) {
          if (bodyLower.contains(#text token)) { acc + 1 } else { acc };
        },
      );
      (c, score);
    });
    let ranked = scored.sort(func(a, b) { Nat.compare(b.1, a.1) });
    let take = if (maxSources > ranked.size()) { ranked.size() } else { maxSources };
    let selected = if (take == 0) { [] } else {
      Array.tabulate(take, func(i) { ranked[i].0 });
    };
    let refs = selected.map(func(c) {
      { contentId = c.contentId; sourceType = c.sourceType; title = c.title };
    });
    let context = selected.foldLeft(
      "",
      func(acc, c) {
        acc # "\n\n[" # c.title # "] " # c.body;
      },
    );
    (refs, context);
  };

  /// Build the JSON body for the LLM outcall. Tunnels a simple prompt to the
  /// frontend-friendly endpoint. The actual LLM call is performed by the
  /// mixin (which has access to the http-outcalls transform callback).
  public func buildLlmPrompt(context : Text, question : Text) : Text {
    "You are an educational AI tutor. Use the following context to answer the student's question. Cite sources by title when relevant.\n\nContext:" # context # "\n\nQuestion: " # question # "\n\nAnswer:";
  };
};
