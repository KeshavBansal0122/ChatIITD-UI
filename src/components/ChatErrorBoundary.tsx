import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ChatErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ChatErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-3 bg-pplx-bg px-6 text-center text-pplx-ink">
          <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="max-w-md text-sm text-pplx-muted">
            {this.state.error.message}
          </p>
          <button
            type="button"
            className="mt-2 rounded-xl bg-iitd-red px-4 py-2 text-sm text-white hover:bg-iitd-red-dark"
            onClick={() => {
              this.setState({ error: null });
              window.location.assign("/");
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
