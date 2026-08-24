import { StrictMode, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Catches render/runtime errors anywhere in the tree and shows a visible
// message instead of a blank white page — the exact failure mode this app
// hit earlier (an Invalid Hook Call left the screen blank with nothing
// visible unless you happened to open devtools).
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("Uncaught render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 12, padding: 32, fontFamily: "system-ui, sans-serif",
          background: "#0d0d13", color: "#fff", textAlign: "center",
        }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Something went wrong.</div>
          <div style={{ fontSize: 13, color: "#a1a1aa", maxWidth: 480 }}>
            {this.state.error.message || "An unexpected error occurred while rendering the app."}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 12, padding: "10px 20px", borderRadius: 10, border: "none",
              background: "#0cdbc8", color: "#0d0d13", fontWeight: 700, cursor: "pointer",
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(reg => {
        // Actively check for a newer service worker on every load instead of
        // only whenever the browser feels like it — this is what was making
        // stale bundles quietly stick around during earlier debugging.
        reg.update();
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            // A new worker installed while an old one is already controlling
            // the page — reload once, automatically, so the person gets the
            // new build instead of silently running stale code until they
            // manually clear storage.
            if (installing.state === "activated" && navigator.serviceWorker.controller) {
              window.location.reload();
            }
          });
        });
      })
      .catch(() => {
        // PWA install still works without SW; offline caching just won't.
      });
  });
}
