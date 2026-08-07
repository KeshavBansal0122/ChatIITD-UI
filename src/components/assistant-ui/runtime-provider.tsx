"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  ExportedMessageRepository,
  RuntimeAdapterProvider,
  Suggestions,
  useAui,
  useRemoteThreadListRuntime,
  type RemoteThreadListAdapter,
  type ThreadHistoryAdapter,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { useDataStreamRuntime } from "@assistant-ui/react-data-stream";
import { createAssistantStream } from "assistant-stream";
import {
  type FC,
  type PropsWithChildren,
  useMemo,
} from "react";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "";

function authHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function useThreadChatRuntime() {
  const { accessToken, isGuest } = useAuth();
  return useDataStreamRuntime({
    api: `${API_BASE}/assistant/chat`,
    protocol: "data-stream",
    credentials: "include",
    headers: async () => authHeaders(accessToken),
    body: async () => (isGuest ? { guest: true } : {}),
    onError: (error) => {
      console.error("[assistant-ui]", error);
    },
  });
}

const HistoryProvider: FC<
  PropsWithChildren<{ accessToken: string | null; isGuest: boolean }>
> = ({ children, accessToken, isGuest }) => {
  const aui = useAui();

  const history = useMemo<ThreadHistoryAdapter>(() => {
    return {
      async load() {
        if (isGuest || !accessToken) {
          return { messages: [] };
        }
        try {
          const { remoteId } = aui.threadListItem.getState();
          if (!remoteId || remoteId.startsWith("guest-")) {
            return { messages: [] };
          }
          const res = await fetch(`${API_BASE}/chats/${remoteId}/aui-messages`, {
            headers: authHeaders(accessToken),
          });
          if (!res.ok) return { messages: [] };
          const messages = (await res.json()) as ThreadMessageLike[];
          return ExportedMessageRepository.fromArray(messages);
        } catch (e) {
          console.error("Failed to load thread history", e);
          return { messages: [] };
        }
      },
      async append() {},
    };
  }, [aui, accessToken, isGuest]);

  return (
    <RuntimeAdapterProvider adapters={{ history }}>
      {children}
    </RuntimeAdapterProvider>
  );
};

function makeThreadListAdapter(
  accessToken: string | null,
  isGuest: boolean,
): RemoteThreadListAdapter {
  const headers = () => authHeaders(accessToken);

  const AdapterHistoryProvider: FC<PropsWithChildren> = ({ children }) => (
    <HistoryProvider accessToken={accessToken} isGuest={isGuest}>
      {children}
    </HistoryProvider>
  );

  return {
      async list() {
      if (isGuest || !accessToken) {
        return { threads: [] };
      }
      try {
        const res = await fetch(`${API_BASE}/chats`, { headers: headers() });
        if (res.status === 401) return { threads: [] };
        if (!res.ok) {
          console.error("Failed to list chats", res.status);
          return { threads: [] };
        }
        const rows = (await res.json()) as Array<{
          id: number | string;
          title?: string | null;
          created_at?: string;
        }>;
        return {
          threads: rows.map((t) => ({
            status: "regular" as const,
            remoteId: String(t.id),
            title: t.title ?? undefined,
            lastMessageAt: t.created_at ? new Date(t.created_at) : undefined,
          })),
        };
      } catch (e) {
        console.error("Failed to list chats", e);
        return { threads: [] };
      }
    },

    async initialize() {
      if (isGuest || !accessToken) {
        return { remoteId: `guest-${crypto.randomUUID()}` };
      }
      const res = await fetch(`${API_BASE}/chats`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ title: "New Chat" }),
      });
      if (!res.ok) throw new Error("Failed to create chat");
      const chat = await res.json();
      return { remoteId: String(chat.id) };
    },

    async rename(remoteId, title) {
      if (isGuest || remoteId.startsWith("guest-")) return;
      await fetch(`${API_BASE}/chats/${remoteId}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ title }),
      });
    },

    async archive(remoteId) {
      await this.delete(remoteId);
    },

    async unarchive() {},

    async delete(remoteId) {
      if (isGuest || remoteId.startsWith("guest-")) return;
      await fetch(`${API_BASE}/chats/${remoteId}`, {
        method: "DELETE",
        headers: headers(),
      });
    },

    async fetch(remoteId) {
      if (isGuest || remoteId.startsWith("guest-")) {
        return { status: "regular" as const, remoteId, title: "Guest chat" };
      }
      const res = await fetch(`${API_BASE}/chats/${remoteId}`, {
        headers: headers(),
      });
      if (!res.ok) throw new Error("Chat not found");
      const t = await res.json();
      return {
        status: "regular" as const,
        remoteId: String(t.id),
        title: t.title ?? undefined,
      };
    },

    async generateTitle(remoteId, messages) {
      return createAssistantStream(async (controller) => {
        if (isGuest || remoteId.startsWith("guest-")) {
          controller.appendText("Guest chat");
          return;
        }
        const res = await fetch(`${API_BASE}/chats/${remoteId}/title`, {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ messages }),
        });
        if (!res.ok) {
          controller.appendText("New Chat");
          return;
        }
        const data = await res.json();
        controller.appendText(data.title || "New Chat");
      });
    },

    unstable_Provider: AdapterHistoryProvider,
  };
}

const SUGGESTIONS = Suggestions([
  "What courses should I take next semester?",
  "How does the CGPA grading system work?",
  "What are the prerequisites for COL334?",
  "Can you explain Minor programme options?",
]);

export const ChatRuntimeProvider: FC<PropsWithChildren> = ({ children }) => {
  const { accessToken, isGuest } = useAuth();

  const adapter = useMemo(
    () => makeThreadListAdapter(accessToken, isGuest),
    [accessToken, isGuest],
  );

  const runtime = useRemoteThreadListRuntime({
    runtimeHook: useThreadChatRuntime,
    adapter,
  });

  const config = useMemo(() => AuiConfig({ suggestions: SUGGESTIONS }), []);

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      {children}
    </AssistantRuntimeProvider>
  );
};
