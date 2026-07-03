import Array "mo:core/Array";
import Int "mo:core/Int";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import AccessControl "mo:caffeineai-authorization/access-control";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import Types "../types/ai-tutor";
import AITutorLib "../lib/ai-tutor";
import BlogTypes "../types/blogs";
import NoteTypes "../types/notes";
import VideoTypes "../types/videos";
import Videos "../lib/videos";

// Public API surface for the AI tutor domain.
//
// State injected via the mixin parameter (same pattern as blogs/notes/videos):
//   conversations       : List.List<Types.Conversation>      -- all chat conversations
//   messages            : List.List<Types.Message>           -- all chat messages
//   nextConversationId  : { var value : Nat }                -- conversation id counter
//   nextMessageId       : { var value : Nat }                -- message id counter
//   accessControlState  : AccessControl.AccessControlState   -- for role checks
//   blogs               : List.List<BlogTypes.Blog>         -- RAG source: blogs
//   notes               : List.List<NoteTypes.Note>         -- RAG source: notes
//   videoStore          : Videos.VideoStore                  -- RAG source: videos
mixin (
  conversations : List.List<Types.Conversation>,
  messages : List.List<Types.Message>,
  nextConversationId : { var value : Nat },
  nextMessageId : { var value : Nat },
  accessControlState : AccessControl.AccessControlState,
  blogs : List.List<BlogTypes.Blog>,
  notes : List.List<NoteTypes.Note>,
  videoStore : Videos.VideoStore,
) {
  // -------------------------------------------------------------------------
  // RAG context builder: collect candidate sources from blogs/notes/videos.
  // Public blogs/notes are always candidates; the caller's own uploads are
  // also candidates even if unpublished.
  // -------------------------------------------------------------------------
  func buildRagCandidates(caller : Principal) : [AITutorLib.RagCandidate] {
    let blogArr = blogs.toArray();
    let blogCandidates = Array.map<BlogTypes.Blog, AITutorLib.RagCandidate>(
      blogArr.filter(func(b) {
        b.published or b.author == caller;
      }),
      func(b) {
        {
          contentId = b.id;
          sourceType = #blog;
          title = b.title;
          body = b.content;
          author = b.author;
        };
      },
    );
    let noteArr = notes.toArray();
    let noteCandidates = Array.map<NoteTypes.Note, AITutorLib.RagCandidate>(
      noteArr.filter(func(n) {
        n.published or n.author == caller;
      }),
      func(n) {
        {
          contentId = n.id;
          sourceType = #note;
          title = n.title;
          body = n.description;
          author = n.author;
        };
      },
    );
    let videoEntries = videoStore.videos.toArray();
    let videoCandidates = Array.map<(VideoTypes.VideoId, VideoTypes.Video), AITutorLib.RagCandidate>(
      videoEntries.filter(func(_, v) {
        v.published or v.author == caller;
      }),
      func(_, v) {
        {
          contentId = v.id;
          sourceType = #video;
          title = v.title;
          body = v.description;
          author = v.author;
        };
      },
    );
    blogCandidates.concat(noteCandidates).concat(
      videoCandidates,
    );
  };

  // Create a new conversation for the authenticated caller. The title is
  // auto-derived from the first message; pass an empty title to start.
  // Requires authenticated User role.
  public shared ({ caller }) func createConversation(title : Text) : async Types.Conversation {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can create conversations");
    };
    AITutorLib.createConversation(conversations, nextConversationId, caller, title, Int.abs(Time.now()));
  };

  // Delete a conversation owned by the authenticated caller.
  // Returns true if a conversation was removed. Requires authenticated User role.
  public shared ({ caller }) func deleteConversation(conversationId : Nat) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can delete conversations");
    };
    switch (AITutorLib.findConversation(conversations, conversationId)) {
      case null { Runtime.trap("Conversation not found") };
      case (?convo) {
        if (convo.user != caller) {
          Runtime.trap("Unauthorized: Only the owner can delete this conversation");
        };
        AITutorLib.deleteConversation(conversations, messages, conversationId);
      };
    };
  };

  // List all conversations owned by the authenticated caller, newest first.
  // Requires authenticated User role.
  public shared ({ caller }) func listConversations() : async [Types.Conversation] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can list conversations");
    };
    AITutorLib.listConversations(conversations, caller);
  };

  // List all messages in a conversation owned by the authenticated caller,
  // in chronological order. Requires authenticated User role.
  public shared ({ caller }) func getMessages(conversationId : Nat) : async [Types.Message] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can read messages");
    };
    switch (AITutorLib.findConversation(conversations, conversationId)) {
      case null { Runtime.trap("Conversation not found") };
      case (?convo) {
        if (convo.user != caller) {
          Runtime.trap("Unauthorized: Only the owner can read this conversation");
        };
        AITutorLib.getMessages(messages, conversationId);
      };
    };
  };

  // Send a user message to the AI tutor. Builds RAG context from public
  // blogs/notes/videos plus the caller's own uploads, calls the LLM via
  // http-outcalls, stores both user and assistant messages, and returns the
  // assistant response with source citations. Requires authenticated User role.
  public shared ({ caller }) func sendMessage(
    conversationId : Nat,
    userMessage : Text,
  ) : async Types.SendMessageResult {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can send messages");
    };
    switch (AITutorLib.findConversation(conversations, conversationId)) {
      case null { Runtime.trap("Conversation not found") };
      case (?convo) {
        if (convo.user != caller) {
          Runtime.trap("Unauthorized: Only the owner can send messages to this conversation");
        };
        // Store the user message.
        let _userMsg = AITutorLib.appendMessage(
          messages,
          nextMessageId,
          conversationId,
          #user,
          userMessage,
          [],
          Int.abs(Time.now()),
        );
        // Build RAG context.
        let candidates = buildRagCandidates(caller);
        let (sources, context) = AITutorLib.buildRagContext(candidates, userMessage, 5);
        // Build the LLM prompt and call the LLM via http-outcalls.
        let prompt = AITutorLib.buildLlmPrompt(context, userMessage);
        let llmUrl = "https://api.openai.com/v1/chat/completions";
        let llmBody = "{\"model\":\"gpt-4o-mini\",\"messages\":[{\"role\":\"system\",\"content\":\"You are an educational AI tutor. Answer using the provided context and cite sources by title.\"},{\"role\":\"user\",\"content\":\"" # prompt # "\"}]}";
        let llmHeaders = [
          { name = "Content-Type"; value = "application/json" },
        ];
        let llmResponse = await OutCall.httpPostRequest(llmUrl, llmHeaders, llmBody, transform);
        // Tunnel the raw LLM JSON response as the assistant message content;
        // the frontend parses it. Append the assistant message with sources.
        let assistantMsg = AITutorLib.appendMessage(
          messages,
          nextMessageId,
          conversationId,
          #assistant,
          llmResponse,
          sources,
          Int.abs(Time.now()),
        );
        AITutorLib.touchConversation(conversations, conversationId, Int.abs(Time.now()));
        { message = assistantMsg; sources };
      };
    };
  };

  // HTTP outcalls transform callback (required by the IC for HTTP outcalls).
  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };
};
