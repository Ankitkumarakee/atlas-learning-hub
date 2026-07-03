import { ChatMessage } from "@/components/shared/ChatMessage";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { TypingIndicator } from "@/components/shared/TypingIndicator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useMessages,
  useSendMessage,
} from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  Bot,
  Clock,
  LogIn,
  MessageSquarePlus,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Suggested prompts                                                  */
/* ------------------------------------------------------------------ */

const SUGGESTED_PROMPTS = [
  "Explain a concept from my notes",
  "Summarize the latest blogs",
  "Help me understand a video topic",
  "Quiz me on recent content",
  "What should I study next based on my activity?",
  "Give me a quick recap of this week's uploads",
];

/* ------------------------------------------------------------------ */
/* Time helpers                                                       */
/* ------------------------------------------------------------------ */

function formatRelativeTime(ts: bigint): string {
  const ms = Number(ts);
  if (!ms) return "";
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/* Sidebar                                                            */
/* ------------------------------------------------------------------ */

interface SidebarProps {
  activeId: bigint | null;
  onSelect: (id: bigint) => void;
  onNew: () => void;
}

function ConversationSidebar({ activeId, onSelect, onNew }: SidebarProps) {
  const { data: conversations, isLoading } = useConversations();
  const deleteConversation = useDeleteConversation();
  const navigate = useNavigate();

  const handleDelete = (id: bigint) => {
    deleteConversation.mutate(id, {
      onSuccess: () => {
        toast.success("Conversation deleted");
        if (activeId === id) navigate({ to: "/tutor" });
      },
      onError: (e) => toast.error(`Failed to delete: ${String(e)}`),
    });
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="font-display text-sm font-semibold tracking-wide text-foreground">
          Conversations
        </h2>
        <Button
          size="sm"
          variant="secondary"
          onClick={onNew}
          data-ocid="tutor.new_chat_button"
        >
          <MessageSquarePlus className="size-4" aria-hidden />
          New
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <ul className="space-y-1 p-2" aria-label="Conversation history">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <li
                key={`tutor-sidebar-loading-${i}`}
                className="px-2 py-2"
                data-ocid={`tutor.sidebar.loading_state.item.${i + 1}`}
              >
                <Skeleton className="h-12 w-full rounded-lg" />
              </li>
            ))}

          {!isLoading && (!conversations || conversations.length === 0) && (
            <li
              className="px-2 py-6 text-center text-xs text-muted-foreground"
              data-ocid="tutor.sidebar.empty_state"
            >
              No conversations yet. Start a new chat.
            </li>
          )}

          {!isLoading &&
            conversations &&
            conversations.length > 0 &&
            conversations.map((c, i) => {
              const isActive = activeId !== null && activeId === c.id;
              return (
                <li
                  key={c.id.toString()}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-2 py-2 transition-smooth",
                    isActive
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                  data-ocid={`tutor.sidebar.item.${i + 1}`}
                  aria-label={`Conversation: ${c.title}, updated ${formatRelativeTime(c.updatedAt)}`}
                  aria-current={isActive ? "true" : undefined}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
                    data-ocid={`tutor.sidebar.open_button.${i + 1}`}
                  >
                    <span className="flex w-full items-center gap-1.5">
                      <Bot className="size-4 shrink-0" aria-hidden />
                      <span className="truncate text-sm font-medium">
                        {c.title}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 pl-5 text-[11px] text-muted-foreground">
                      <Clock className="size-3" aria-hidden />
                      {formatRelativeTime(c.updatedAt)}
                    </span>
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Delete conversation ${c.title}`}
                        className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-smooth hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        data-ocid={`tutor.sidebar.delete_button.${i + 1}`}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent data-ocid="tutor.sidebar.delete_dialog">
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete conversation?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently removes &ldquo;{c.title}&rdquo; and
                          its message history.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-ocid="tutor.sidebar.delete_dialog.cancel_button">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(c.id)}
                          data-ocid="tutor.sidebar.delete_dialog.confirm_button"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              );
            })}
        </ul>
      </ScrollArea>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Sign-in gate                                                       */
/* ------------------------------------------------------------------ */

function SignInGate({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        icon={Bot}
        title="Sign in to use the AI Tutor"
        description="Ask anything — answers are grounded in your uploads and all public platform content. Sign in with Internet Identity to start chatting."
        actionLabel="Sign in with Internet Identity"
        onAction={onSignIn}
        ocid="tutor.signin.empty_state"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chat area                                                          */
/* ------------------------------------------------------------------ */

interface ChatAreaProps {
  conversationId: bigint | null;
}

function ChatArea({ conversationId }: ChatAreaProps) {
  const { data: messages, isLoading } = useMessages(
    conversationId ?? undefined,
  );
  const sendMessage = useSendMessage();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sendMessage.isPending]);

  const hasMessages = !!messages && messages.length > 0;
  const hasError = sendMessage.isError;

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !conversationId || sendMessage.isPending) return;
    sendMessage.mutate(
      { conversationId, userMessage: trimmed },
      {
        onError: (e) => toast.error(`Failed to send: ${String(e)}`),
      },
    );
    setDraft("");
  };

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          {isLoading && (
            <div className="space-y-6" data-ocid="tutor.chat.loading_state">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={`tutor-loading-${i}`}
                  className="flex gap-3"
                  data-ocid={`tutor.chat.loading_state.item.${i + 1}`}
                >
                  <Skeleton className="size-8 shrink-0 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-72" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && !hasMessages && (
            <div
              className="flex flex-col items-center justify-center gap-6 py-16 text-center"
              data-ocid="tutor.chat.empty_state"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
              >
                <Sparkles className="size-8" aria-hidden />
              </motion.div>
              <div className="space-y-2">
                <h2 className="font-display text-2xl font-semibold tracking-tight">
                  Ask the AI Tutor
                </h2>
                <p className="mx-auto max-w-md text-sm text-muted-foreground">
                  Get answers grounded in your uploads and all public platform
                  content. Try one of these to begin.
                </p>
              </div>
              <fieldset
                className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2"
                aria-label="Suggested prompts"
              >
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <motion.button
                    key={prompt}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    whileHover={{ y: -2 }}
                    disabled={!conversationId || sendMessage.isPending}
                    onClick={() => submit(prompt)}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-foreground transition-smooth hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    data-ocid={`tutor.suggested_prompt.button.${i + 1}`}
                    aria-label={`Suggested prompt: ${prompt}`}
                  >
                    {prompt}
                  </motion.button>
                ))}
              </fieldset>
            </div>
          )}

          {!isLoading && hasMessages && (
            <div className="space-y-6">
              {messages.map((m, i) => (
                <ChatMessage key={m.id.toString()} message={m} index={i + 1} />
              ))}
              {sendMessage.isPending && (
                <div
                  className="flex gap-3"
                  data-ocid="tutor.chat.pending_state"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Bot className="size-4" aria-hidden />
                  </div>
                  <TypingIndicator
                    ocid="tutor.chat.typing_indicator"
                    label="AI tutor is typing a response"
                  />
                </div>
              )}
              {hasError && (
                <ErrorState
                  title="Message failed to send"
                  message="We couldn't deliver your message. Please try again."
                  retryLabel="Retry"
                  onRetry={() => sendMessage.reset()}
                  ocid="tutor.chat.error_state"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-card px-4 py-4 sm:px-8">
        <form
          className="mx-auto flex w-full max-w-3xl items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit(draft);
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              conversationId
                ? "Ask anything about your uploads or public content..."
                : "Start a new chat to begin"
            }
            disabled={!conversationId || sendMessage.isPending}
            aria-label="Message the AI tutor"
            data-ocid="tutor.input"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!conversationId || !draft.trim() || sendMessage.isPending}
            aria-label="Send message"
            data-ocid="tutor.send_button"
          >
            <Send className="size-4" aria-hidden />
          </Button>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function AITutorPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const createConversation = useCreateConversation();

  const conversationIdParam = params.conversationId as string | undefined;
  const conversationId = conversationIdParam
    ? BigInt(conversationIdParam)
    : null;

  const handleNewChat = () => {
    createConversation.mutate("New conversation", {
      onSuccess: (conv) => {
        toast.success("Conversation created");
        navigate({
          to: "/tutor/$conversationId",
          params: { conversationId: conv.id.toString() },
        });
      },
      onError: (e) =>
        toast.error(`Failed to create conversation: ${String(e)}`),
    });
  };

  const handleSelect = (id: bigint) => {
    navigate({
      to: "/tutor/$conversationId",
      params: { conversationId: id.toString() },
    });
  };

  if (auth.isGuest) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col">
        <SignInGate onSignIn={auth.signIn} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <div className="h-48 w-full shrink-0 border-b border-border lg:h-full lg:w-72 lg:border-b-0">
        <ConversationSidebar
          activeId={conversationId}
          onSelect={handleSelect}
          onNew={handleNewChat}
        />
      </div>
      <ChatArea conversationId={conversationId} />
    </div>
  );
}
