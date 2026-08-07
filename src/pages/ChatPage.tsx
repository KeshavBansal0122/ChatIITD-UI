import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, PanelLeftClose, PanelLeft, UserRound, LogOut } from "lucide-react";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { ChatRuntimeProvider } from "@/components/assistant-ui/runtime-provider";
import { ChatErrorBoundary } from "@/components/ChatErrorBoundary";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout, isGuest, isAuthenticated } = useAuth();

  return (
    <ChatErrorBoundary>
    <ChatRuntimeProvider>
      <div className="flex h-screen overflow-hidden bg-pplx-bg text-pplx-ink">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden h-full flex-col border-r border-pplx-border bg-[#f1ece5] transition-all md:flex",
            sidebarOpen ? "w-64 p-3" : "w-0 overflow-hidden p-0 border-0",
          )}
        >
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-sm font-semibold tracking-tight">
                Chat<span className="text-iitd-red">IITD</span>
              </span>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-pplx-muted hover:bg-black/5"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="size-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <ThreadList />
          </div>
          <SidebarFooter isGuest={isGuest} isAuthenticated={isAuthenticated} onLogout={logout} />
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/30"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-pplx-border bg-[#f1ece5] p-3 shadow-xl">
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="text-sm font-semibold tracking-tight">
                    Chat<span className="text-iitd-red">IITD</span>
                  </span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-1.5 text-pplx-muted hover:bg-black/5"
                >
                  <PanelLeftClose className="size-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1" onClick={() => setMobileOpen(false)}>
                <ThreadList />
              </div>
              <SidebarFooter isGuest={isGuest} isAuthenticated={isAuthenticated} onLogout={logout} />
            </aside>
          </div>
        )}

        <main className="relative flex min-w-0 flex-1 flex-col">
          <div className="absolute left-3 top-3 z-10 flex items-center gap-1">
            <button
              type="button"
              className="rounded-xl border border-pplx-border bg-pplx-surface p-2 text-pplx-muted shadow-sm hover:bg-[#f1ece5] md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-4" />
            </button>
            {!sidebarOpen && (
              <button
                type="button"
                className="hidden rounded-xl border border-pplx-border bg-pplx-surface p-2 text-pplx-muted shadow-sm hover:bg-[#f1ece5] md:inline-flex"
                onClick={() => setSidebarOpen(true)}
                aria-label="Expand sidebar"
              >
                <PanelLeft className="size-4" />
              </button>
            )}
          </div>
          <Thread />
        </main>
      </div>
    </ChatRuntimeProvider>
    </ChatErrorBoundary>
  );
}

function SidebarFooter({
  isGuest,
  isAuthenticated,
  onLogout,
}: {
  isGuest: boolean;
  isAuthenticated: boolean;
  onLogout: () => void;
}) {
  return (
    <div className="mt-3 space-y-1 border-t border-pplx-border pt-3">
      {isAuthenticated && !isGuest && (
        <Link
          to="/profile"
          className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-pplx-ink/80 hover:bg-[#ebe4da]"
        >
          <UserRound className="size-4" />
          Profile
        </Link>
      )}
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-pplx-ink/80 hover:bg-[#ebe4da]"
      >
        <LogOut className="size-4" />
        {isGuest ? "Exit guest" : "Sign out"}
      </button>
    </div>
  );
}
