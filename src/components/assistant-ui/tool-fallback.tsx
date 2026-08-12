"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { CheckIcon, ChevronDownIcon, LoaderIcon, WrenchIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const FRIENDLY: Record<string, (args: Record<string, unknown>) => string> = {
  query_sqlite_db: () => "Digging up courses data…",
  get_course_data: (args) => {
    const codes = args.course_codes;
    if (Array.isArray(codes) && codes.length) {
      return `Checking out ${codes.join(", ")}…`;
    }
    return "Checking out courses…";
  },
  get_programme_structure: (args) => {
    const code = args.programme_code;
    return code
      ? `Checking the programme structure for ${String(code)}…`
      : "Checking the programme structure…";
  },
  search_cos: () => "Searching in Courses of Study…",
  list_cos_sections: () => "Reading Courses of Study headers…",
  get_cos_section: () => "Reading a Courses of Study section…",
  search_courses: () => "Searching in Courses of Study…",
  get_wiki_page: (args) =>
    args.page_title ? `Reading wiki: ${String(args.page_title)}…` : "Reading the campus wiki…",
  search_wiki: () => "Searching the campus wiki…",
};

export const ToolFallback: ToolCallMessagePartComponent = ({
  toolName,
  argsText,
  args,
  result,
  status,
}) => {
  const [open, setOpen] = useState(false);
  const isRunning = status?.type === "running";
  const friendly =
    FRIENDLY[toolName]?.((args as Record<string, unknown>) ?? {}) ?? `Using ${toolName}…`;

  return (
    <div className="mb-2 w-full rounded-2xl border border-pplx-border bg-pplx-surface/80 text-sm text-pplx-ink data-[running=true]:border-iitd-red/25 data-[running=true]:bg-iitd-red-soft/30"
      data-running={isRunning || undefined}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        {isRunning ? (
          <LoaderIcon className="size-3.5 animate-spin text-iitd-red" />
        ) : (
          <WrenchIcon className="size-3.5 text-iitd-red/70" />
        )}
        <span className="flex-1 truncate font-medium">{friendly}</span>
        {!isRunning && <CheckIcon className="size-3.5 text-iitd-red/60" />}
        <ChevronDownIcon
          className={cn("size-3.5 text-pplx-muted transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="space-y-2 border-t border-pplx-border px-3 py-2 font-mono text-xs text-pplx-muted">
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wide">Args</div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all">
              {argsText || JSON.stringify(args, null, 2)}
            </pre>
          </div>
          {result !== undefined && (
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wide">Result</div>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all">
                {typeof result === "string" ? result.slice(0, 2000) : JSON.stringify(result, null, 2).slice(0, 2000)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
