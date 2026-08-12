"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useMessageError } from "@assistant-ui/core/react";
import { ErrorPrimitive, MessagePrimitive } from "@assistant-ui/react";
import { Link } from "react-router-dom";
import { Clock, Zap } from "lucide-react";
import { useEffect, useState, type FC } from "react";

type QuotaPayload = {
  error?: string;
  resets_at?: string | null;
  detail?: unknown;
  message?: string;
  used?: number;
  limit?: number;
  window_hours?: number;
};

function asQuotaPayload(data: unknown): QuotaPayload | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;

  // FastAPI sometimes wraps body as { detail: { ...quota fields } }
  const nested =
    obj.detail && typeof obj.detail === "object"
      ? (obj.detail as Record<string, unknown>)
      : null;
  const src = nested ?? obj;

  const error = typeof src.error === "string" ? src.error : undefined;
  const message =
    typeof src.message === "string"
      ? src.message
      : typeof src.detail === "string"
        ? src.detail
        : typeof obj.detail === "string"
          ? obj.detail
          : undefined;
  const resets_at =
    typeof src.resets_at === "string"
      ? src.resets_at
      : typeof obj.resets_at === "string"
        ? obj.resets_at
        : null;

  const isQuota =
    error === "quota_exceeded" ||
    error === "missing_device" ||
    resets_at != null ||
    /token limit|quota/i.test(message ?? "");

  if (!isQuota) return null;

  return {
    error: error ?? "quota_exceeded",
    message,
    resets_at,
    used: typeof src.used === "number" ? src.used : undefined,
    limit: typeof src.limit === "number" ? src.limit : undefined,
    window_hours:
      typeof src.window_hours === "number" ? src.window_hours : undefined,
  };
}

export function parseQuotaError(raw: unknown): QuotaPayload | null {
  // If the error is already a plain object (not stringified), try it directly
  if (raw !== null && typeof raw === "object" && !(raw instanceof Error)) {
    const direct = asQuotaPayload(raw);
    if (direct) return direct;
  }

  const str =
    raw instanceof Error
      ? raw.message
      : typeof raw === "string"
        ? raw
        : JSON.stringify(raw);

  const match = str.match(/^Status\s+429:\s*(.*)$/s);
  const body = match ? match[1].trim() : str.trim();

  try {
    const parsed = asQuotaPayload(JSON.parse(body));
    if (parsed) return parsed;
  } catch {
    // not JSON — fall through
  }

  // Try parsing the whole string as JSON in case there's no "Status 429:" prefix
  if (body !== str) {
    try {
      const parsed = asQuotaPayload(JSON.parse(str));
      if (parsed) return parsed;
    } catch {
      // not JSON
    }
  }

  if (/quota_exceeded|token limit reached|guest token limit/i.test(str)) {
    const resets = str.match(/"resets_at"\s*:\s*"([^"]+)"/);
    return {
      error: "quota_exceeded",
      message: str,
      resets_at: resets?.[1] ?? null,
    };
  }
  return null;
}

function formatTimeLeft(resetsAt: string | null | undefined, now: number): string {
  if (!resetsAt) return "a few hours";
  const ms = new Date(resetsAt).getTime() - now;
  if (Number.isNaN(ms) || ms <= 0) return "soon";
  const totalMins = Math.max(1, Math.ceil(ms / 60_000));
  if (totalMins < 60) return `${totalMins} min`;
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remH = hours % 24;
    return remH > 0 ? `${days}d ${remH}h` : `${days}d`;
  }
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export const SessionLimitAlert: FC<{
  resetsAt?: string | null;
  used?: number;
  limit?: number;
}> = ({ resetsAt, used, limit }) => {
  const { isGuest, isAuthenticated } = useAuth();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!resetsAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, [resetsAt]);

  const timeLeft = formatTimeLeft(resetsAt, now);
  const resetTime = resetsAt
    ? new Date(resetsAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
  const resetDay = resetsAt
    ? new Date(resetsAt).toLocaleDateString(undefined, { weekday: "short" })
    : null;

  const usagePct =
    used != null && limit != null && limit > 0
      ? Math.min(100, Math.round((used / limit) * 100))
      : null;

  const byokHref = isGuest || !isAuthenticated ? "/login" : "/profile";
  const byokLabel =
    isGuest || !isAuthenticated ? "Sign in to add a key" : "Add your API key";

  return (
    <div
      role="alert"
      className="overflow-hidden rounded-2xl border border-[#ddd0c6] bg-[#faf7f4] shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-iitd-red/10"
          aria-hidden
        >
          <Clock className="size-[15px] text-iitd-red" strokeWidth={2} />
        </div>
        <div>
          <p className="text-sm font-semibold text-pplx-ink">
            Shared usage limit reached
          </p>
          <p className="text-xs text-pplx-muted">
            The free pool of tokens for this window is exhausted.
          </p>
        </div>
      </div>

      {/* Usage bar (shown when we have the numbers) */}
      {usagePct !== null && used != null && limit != null && (
        <div className="mx-4 mb-3">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[0.7rem] font-medium uppercase tracking-widest text-pplx-muted">
              Tokens used
            </span>
            <span className="font-mono text-[0.7rem] tabular-nums text-pplx-muted">
              {used.toLocaleString()} / {limit.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e8e0d8]">
            <div
              className="h-full rounded-full bg-iitd-red transition-all"
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </div>
      )}

      {/* Reset countdown */}
      <div className="mx-4 mb-3 flex items-center justify-between rounded-xl bg-[#f1ebe3] px-3.5 py-2.5">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-pplx-muted">
            Resets in
          </p>
          <p className="mt-0.5 font-mono text-xl font-bold tabular-nums tracking-tight text-pplx-ink">
            {timeLeft}
          </p>
        </div>
        {resetTime && (
          <div className="text-right">
            <p className="text-xs font-medium text-pplx-ink">{resetTime}</p>
            {resetDay && (
              <p className="text-[0.65rem] text-pplx-muted">{resetDay}</p>
            )}
          </div>
        )}
      </div>

      {/* BYOK footer */}
      <div className="flex items-center gap-2.5 border-t border-[#e6ddd5] bg-[#f4efe9] px-4 py-3">
        <Zap className="size-3.5 shrink-0 text-iitd-red" aria-hidden />
        <p className="flex-1 text-xs leading-4 text-pplx-muted">
          Use your own API key to{" "}
          <span className="font-medium text-pplx-ink">skip limits entirely</span>.
        </p>
        <Link
          to={byokHref}
          className="shrink-0 rounded-lg bg-iitd-red px-3 py-1.5 text-[0.72rem] font-semibold tracking-wide text-white transition-colors hover:bg-iitd-red-dark"
        >
          {byokLabel}
        </Link>
      </div>
    </div>
  );
};

/** Renders inside MessagePrimitive.Error when the run failed. */
export const MessageErrorAlert: FC = () => {
  const error = useMessageError();
  if (error === undefined) return null;

  // Try the raw error object first (handles plain objects from the runtime),
  // then fall back to string-based parsing.
  const quota = parseQuotaError(error);

  if (quota) {
    return (
      <SessionLimitAlert
        resetsAt={quota.resets_at}
        used={quota.used}
        limit={quota.limit}
      />
    );
  }

  return (
    <ErrorPrimitive.Root className="rounded-xl border border-iitd-red/25 bg-iitd-red-soft/30 px-4 py-3 text-sm leading-5 text-iitd-red-dark">
      <ErrorPrimitive.Message />
    </ErrorPrimitive.Root>
  );
};

export const AssistantMessageError: FC = () => (
  <MessagePrimitive.Error>
    <div className="mt-1 max-w-full">
      <MessageErrorAlert />
    </div>
  </MessagePrimitive.Error>
);
