"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useMessageError } from "@assistant-ui/core/react";
import { ErrorPrimitive, MessagePrimitive } from "@assistant-ui/react";
import { Link } from "react-router-dom";
import { useEffect, useState, type FC } from "react";

type QuotaPayload = {
  error?: string;
  resets_at?: string | null;
  detail?: string;
  message?: string;
};

export function parseQuotaError(raw: string): QuotaPayload | null {
  const match = raw.match(/^Status\s+429:\s*(.*)$/s);
  if (!match) {
    if (/quota_exceeded|token limit reached|guest token limit/i.test(raw)) {
      return { error: "quota_exceeded", message: raw };
    }
    return null;
  }
  try {
    const data = JSON.parse(match[1].trim()) as QuotaPayload;
    if (
      data.error === "quota_exceeded" ||
      data.error === "missing_device" ||
      typeof data.resets_at === "string" ||
      /token limit/i.test(String(data.detail ?? data.message ?? ""))
    ) {
      return data;
    }
  } catch {
    if (/token limit|quota/i.test(match[1])) {
      return { error: "quota_exceeded", message: match[1] };
    }
  }
  return null;
}

function formatTimeLeft(resetsAt: string | null | undefined, now: number): string {
  if (!resetsAt) return "a few hours";
  const ms = new Date(resetsAt).getTime() - now;
  if (Number.isNaN(ms) || ms <= 0) return "soon";
  const totalMins = Math.max(1, Math.ceil(ms / 60_000));
  if (totalMins < 60) {
    return `${totalMins} minute${totalMins === 1 ? "" : "s"}`;
  }
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (mins === 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${hours}h ${mins}m`;
}

export const SessionLimitAlert: FC<{ resetsAt?: string | null }> = ({
  resetsAt,
}) => {
  const { isGuest, isAuthenticated } = useAuth();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!resetsAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [resetsAt]);

  const timeLeft = formatTimeLeft(resetsAt, now);

  return (
    <div
      role="alert"
      className="rounded-2xl border border-iitd-red/25 bg-iitd-red-soft/40 px-4 py-3 text-[0.95rem] leading-6 text-iitd-red-dark"
    >
      <p className="font-semibold tracking-tight text-iitd-red-dark">
        Session Limit Reached
      </p>
      <p className="mt-1 text-sm text-iitd-red-dark/90">
        Your shared token window is used up. Resets in{" "}
        <span className="font-medium">{timeLeft}</span>
        {resetsAt ? (
          <span className="text-iitd-red-dark/70">
            {" "}
            ({new Date(resetsAt).toLocaleString(undefined, {
              hour: "numeric",
              minute: "2-digit",
              month: "short",
              day: "numeric",
            })})
          </span>
        ) : null}
        .
      </p>
      <p className="mt-2 text-sm text-iitd-red-dark/90">
        {isGuest || !isAuthenticated ? (
          <>
            <Link
              to="/login"
              className="font-medium underline underline-offset-2 hover:text-iitd-red"
            >
              Sign in
            </Link>{" "}
            and add your own API key (BYOK) in Profile to remove limits.
          </>
        ) : (
          <>
            Add your own API key (BYOK) in{" "}
            <Link
              to="/profile"
              className="font-medium underline underline-offset-2 hover:text-iitd-red"
            >
              Profile
            </Link>{" "}
            to remove limits.
          </>
        )}
      </p>
    </div>
  );
};

/** Renders inside MessagePrimitive.Error when the run failed. */
export const MessageErrorAlert: FC = () => {
  const error = useMessageError();
  if (error === undefined) return null;

  const raw = error instanceof Error ? error.message : String(error);
  const quota = parseQuotaError(raw);

  if (quota) {
    return <SessionLimitAlert resetsAt={quota.resets_at} />;
  }

  return (
    <ErrorPrimitive.Root className="rounded-2xl border border-iitd-red/25 bg-iitd-red-soft/40 px-4 py-3 text-sm text-iitd-red-dark">
      <ErrorPrimitive.Message />
    </ErrorPrimitive.Root>
  );
};

export const AssistantMessageError: FC = () => (
  <MessagePrimitive.Error>
    <div className="mt-2">
      <MessageErrorAlert />
    </div>
  </MessagePrimitive.Error>
);
