"use client";

import { cn } from "@/lib/utils";
import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
} from "@assistant-ui/react";
import { PlusIcon, TrashIcon } from "lucide-react";
import type { FC } from "react";

export const ThreadList: FC = () => {
  return (
    <ThreadListPrimitive.Root className="flex h-full flex-col gap-2">
      <ThreadListPrimitive.New
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-pplx-border bg-pplx-surface px-3 py-2.5 text-sm font-medium text-pplx-ink",
          "transition hover:border-iitd-red/35 hover:bg-iitd-red-soft/40 hover:text-iitd-red-dark",
        )}
      >
        <PlusIcon className="size-4" />
        New Thread
      </ThreadListPrimitive.New>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        <ThreadListPrimitive.Items>
          {() => <ThreadListItem />}
        </ThreadListPrimitive.Items>
      </div>
    </ThreadListPrimitive.Root>
  );
};

const ThreadListItem: FC = () => {
  return (
    <ThreadListItemPrimitive.Root
      className={cn(
        "group flex items-center gap-1 rounded-xl px-2 py-1.5 text-sm text-pplx-ink/80",
        "hover:bg-[#f1ece5] data-[active]:bg-iitd-red-soft/55 data-[active]:text-iitd-red-dark",
      )}
    >
      <ThreadListItemPrimitive.Trigger className="min-w-0 flex-1 truncate px-1 py-1 text-left">
        <ThreadListItemPrimitive.Title fallback="New Chat" />
      </ThreadListItemPrimitive.Trigger>
      <ThreadListItemPrimitive.Delete
        className="rounded-lg p-1 text-pplx-muted opacity-0 transition group-hover:opacity-100 hover:bg-iitd-red-soft hover:text-iitd-red"
        aria-label="Delete thread"
      >
        <TrashIcon className="size-3.5" />
      </ThreadListItemPrimitive.Delete>
    </ThreadListItemPrimitive.Root>
  );
};
