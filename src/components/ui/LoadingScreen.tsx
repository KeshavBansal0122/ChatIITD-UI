import { Loader2 } from "lucide-react";

export function LoadingScreen({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-pplx-bg px-4">
      <div className="flex items-center gap-3 text-pplx-muted">
        <Loader2 className="size-5 animate-spin text-iitd-red" />
        <span className="text-sm font-medium tracking-wide">{label}</span>
      </div>
    </div>
  );
}

export function ConfigError({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-pplx-bg p-4">
      <div className="max-w-md rounded-2xl border border-iitd-red/25 bg-iitd-red-soft/40 px-6 py-5 text-iitd-red-dark">
        <h2 className="mb-2 text-base font-semibold tracking-tight">{title}</h2>
        <p className="text-sm opacity-90">{message}</p>
      </div>
    </div>
  );
}
