"use client";

import { cn } from "@/lib/utils";
import {
  type CodeHeaderProps,
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
} from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import { CheckIcon, CopyIcon } from "lucide-react";
import { type FC, memo, useState } from "react";

const MarkdownTextImpl = () => {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="aui-md"
      components={defaultComponents}
    />
  );
};

export const MarkdownText = memo(MarkdownTextImpl);

const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const onCopy = () => {
    if (!code || isCopied) return;
    copyToClipboard(code);
  };

  return (
    <div className="mt-3 flex items-center justify-between gap-4 rounded-t-lg border border-pplx-border bg-[#ede6dd] px-3 py-1.5 text-xs text-pplx-muted">
      <span className="font-mono lowercase">{language || "code"}</span>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-black/5"
      >
        {isCopied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
        {isCopied ? "Copied" : "Copy"}
      </button>
    </div>
  );
};

const useCopyToClipboard = ({ copiedDuration = 2000 }: { copiedDuration?: number } = {}) => {
  const [isCopied, setIsCopied] = useState(false);
  const copyToClipboard = (value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), copiedDuration);
    });
  };
  return { isCopied, copyToClipboard };
};

const defaultComponents = memoizeMarkdownComponents({
  h1: ({ className, ...props }) => (
    <h1 className={cn("mb-3 mt-4 text-2xl font-semibold tracking-tight", className)} {...props} />
  ),
  h2: ({ className, ...props }) => (
    <h2 className={cn("mb-2 mt-3 text-xl font-semibold tracking-tight", className)} {...props} />
  ),
  h3: ({ className, ...props }) => (
    <h3 className={cn("mb-2 mt-3 text-lg font-semibold tracking-tight", className)} {...props} />
  ),
  p: ({ className, ...props }) => (
    <p className={cn("mb-3 leading-7 last:mb-0", className)} {...props} />
  ),
  a: ({ className, ...props }) => (
    <a
      className={cn("underline underline-offset-2 text-pplx-ink/80 hover:text-pplx-ink", className)}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul className={cn("mb-3 list-disc pl-5", className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol className={cn("mb-3 list-decimal pl-5", className)} {...props} />
  ),
  li: ({ className, ...props }) => <li className={cn("mb-1", className)} {...props} />,
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn("mb-3 border-l-4 border-pplx-border pl-4 italic text-pplx-muted", className)}
      {...props}
    />
  ),
  code: function Code({ className, ...props }) {
    const isInline = !className;
    return isInline ? (
      <code
        className={cn("rounded bg-black/5 px-1.5 py-0.5 font-mono text-sm", className)}
        {...props}
      />
    ) : (
      <code className={cn("font-mono text-sm", className)} {...props} />
    );
  },
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "mb-3 overflow-x-auto rounded-b-lg rounded-t-none border border-t-0 border-pplx-border bg-[#f1ece5] p-3",
        className,
      )}
      {...props}
    />
  ),
  CodeHeader,
});
