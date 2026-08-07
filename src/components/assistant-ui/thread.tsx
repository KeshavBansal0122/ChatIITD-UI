"use client";

import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { cn } from "@/lib/utils";
import {
  ActionBarPrimitive,
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
  groupPartByType,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArrowRight,
  CheckIcon,
  CopyIcon,
  RefreshCwIcon,
  Square,
} from "lucide-react";
import type { FC } from "react";

const composerPrimaryActionClassName =
  "absolute inset-0 flex items-center justify-center rounded-full transition-all duration-200 ease-out";

const composerPrimaryActionColorsClassName =
  "bg-iitd-red text-white hover:bg-iitd-red-dark";

const messageActionClassName =
  "flex size-8 items-center justify-center rounded-full text-[#7a7268] transition-colors hover:bg-iitd-red-soft hover:text-iitd-red";

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root
      className="flex h-full flex-col bg-pplx-bg text-pplx-ink"
      style={{ ["--thread-max-width" as string]: "42rem" }}
    >
      <AuiIf condition={(s) => s.thread.isEmpty}>
        <EmptyState />
      </AuiIf>

      <AuiIf condition={(s) => !s.thread.isEmpty}>
        <ThreadPrimitive.Viewport className="flex grow flex-col overflow-y-auto px-4 pt-12">
          <ThreadPrimitive.Messages>
            {({ message }) =>
              message.role === "user" ? <UserMessage /> : <AssistantMessage />
            }
          </ThreadPrimitive.Messages>

          <PendingThinking />

          <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mx-auto mt-auto w-full max-w-[var(--thread-max-width)] bg-gradient-to-b from-transparent via-pplx-bg/85 to-pplx-bg pt-6 pb-4">
            <Composer placeholder="Ask a follow-up" />
          </ThreadPrimitive.ViewportFooter>
        </ThreadPrimitive.Viewport>
      </AuiIf>
    </ThreadPrimitive.Root>
  );
};

/** Shown when the run has started but the assistant turn isn't on screen yet. */
const PendingThinking: FC = () => {
  const show = useAuiState((s) => {
    if (!s.thread.isRunning) return false;
    const last = s.thread.messages[s.thread.messages.length - 1];
    return !last || last.role === "user";
  });
  if (!show) return null;
  return (
    <div className="mx-auto w-full max-w-[var(--thread-max-width)] py-4">
      <ThinkingIndicator />
    </div>
  );
};

const ThinkingIndicator: FC = () => {
  return (
    <div
      className="flex items-center gap-2.5 text-sm text-pplx-muted"
      aria-live="polite"
      aria-label="Thinking"
    >
      <div className="flex items-center gap-1">
        <span
          className="size-1.5 rounded-full bg-iitd-red animate-think-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="size-1.5 rounded-full bg-iitd-red animate-think-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="size-1.5 rounded-full bg-iitd-red animate-think-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
      <span className="font-mono text-xs tracking-wide">thinking…</span>
    </div>
  );
};

const EmptyState: FC = () => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 pb-24">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-iitd-red">
        IIT Delhi
      </p>
      <h1 className="mb-8 text-center text-5xl font-semibold tracking-tight text-pplx-ink sm:text-6xl">
        ChatIITD
      </h1>
      <div className="w-full max-w-[var(--thread-max-width)]">
        <Composer placeholder="Ask anything about courses, rules, or campus…" />
      </div>
      <div className="mt-6 flex w-full max-w-[var(--thread-max-width)] flex-wrap justify-center gap-2">
        <ThreadPrimitive.Suggestions>
          {() => (
            <SuggestionPrimitive.Trigger
              send
              className="rounded-full border border-pplx-border bg-pplx-surface px-3 py-1.5 text-sm text-pplx-ink/80 transition hover:border-iitd-red/40 hover:bg-iitd-red-soft/50 hover:text-iitd-red-dark"
            >
              <SuggestionPrimitive.Title />
            </SuggestionPrimitive.Trigger>
          )}
        </ThreadPrimitive.Suggestions>
      </div>
    </div>
  );
};

const Composer: FC<{ placeholder: string }> = ({ placeholder }) => {
  return (
    <ComposerPrimitive.Root className="group/composer mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col rounded-3xl border border-pplx-border bg-pplx-surface shadow-[0_2px_4px_-2px_rgba(32,24,18,0.06),0_8px_24px_-12px_rgba(32,24,18,0.12)] transition-colors focus-within:border-iitd-red/45 focus-within:shadow-[0_0_0_3px_rgba(163,31,52,0.12)]">
      <ComposerPrimitive.Input
        rows={2}
        placeholder={placeholder}
        className="min-h-20 w-full resize-none bg-transparent px-5 pt-4 pb-0 text-[1.05rem] leading-7 outline-none placeholder:text-pplx-muted"
      />
      <div className="flex items-center justify-end px-3 pb-3 pt-2">
        <div className="relative size-9">
          <ComposerPrimaryAction />
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
};

const ComposerPrimaryAction: FC = () => {
  return (
    <>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel
          className={cn(composerPrimaryActionClassName, composerPrimaryActionColorsClassName)}
        >
          <Square className="size-3.5 fill-current" />
        </ComposerPrimitive.Cancel>
      </AuiIf>
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send
          className={cn(
            composerPrimaryActionClassName,
            composerPrimaryActionColorsClassName,
            "disabled:opacity-40",
          )}
        >
          <ArrowRight className="size-4" />
        </ComposerPrimitive.Send>
      </AuiIf>
    </>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="group/message mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-2 py-4">
      <div className="ml-auto max-w-[85%] rounded-3xl bg-[#ebe4da] px-4 py-2.5 text-[1.02rem] leading-7">
        <MessagePrimitive.Parts />
      </div>
      <ActionBarPrimitive.Root className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover/message:opacity-100 group-focus-within/message:opacity-100">
        <ActionBarPrimitive.Copy className={messageActionClassName}>
          <AuiIf condition={(s) => s.message.isCopied}>
            <CheckIcon className="size-4" />
          </AuiIf>
          <AuiIf condition={(s) => !s.message.isCopied}>
            <CopyIcon className="size-4" />
          </AuiIf>
        </ActionBarPrimitive.Copy>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  const showThinkingBefore = useAuiState((s) => {
    if (s.message.role !== "assistant") return false;
    if (s.message.status?.type !== "running") return false;
    return s.message.content.length === 0;
  });

  return (
    <MessagePrimitive.Root className="group/message mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-2 py-4">
      {showThinkingBefore && <ThinkingIndicator />}
      <div className="text-[1.05rem] leading-7">
        <MessagePrimitive.GroupedParts
          groupBy={groupPartByType({
            "tool-call": ["group-tools"],
          })}
        >
          {({ part, children }) => {
            switch (part.type) {
              case "group-tools":
                return <div className="mb-3 space-y-1">{children}</div>;
              case "text":
                return <MarkdownText />;
              case "tool-call":
                return part.toolUI ?? <ToolFallback {...part} />;
              default:
                return null;
            }
          }}
        </MessagePrimitive.GroupedParts>
      </div>
      <AuiIf
        condition={(s) => {
          if (s.message.status?.type !== "running") return false;
          const parts = s.message.content;
          if (parts.length === 0) return false;
          const hasText = parts.some(
            (p) => p.type === "text" && "text" in p && Boolean(p.text),
          );
          if (hasText) return false;
          const hasTool = parts.some((p) => p.type === "tool-call");
          const toolRunning = parts.some(
            (p) => p.type === "tool-call" && p.status?.type === "running",
          );
          return hasTool && !toolRunning;
        }}
      >
        <ThinkingIndicator />
      </AuiIf>
      <ActionBarPrimitive.Root className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/message:opacity-100 group-focus-within/message:opacity-100">
        <ActionBarPrimitive.Reload className={messageActionClassName}>
          <RefreshCwIcon className="size-4" />
        </ActionBarPrimitive.Reload>
        <ActionBarPrimitive.Copy className={messageActionClassName}>
          <AuiIf condition={(s) => s.message.isCopied}>
            <CheckIcon className="size-4" />
          </AuiIf>
          <AuiIf condition={(s) => !s.message.isCopied}>
            <CopyIcon className="size-4" />
          </AuiIf>
        </ActionBarPrimitive.Copy>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  );
};
