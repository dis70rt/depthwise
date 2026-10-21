import { Component, useState, type ReactNode } from "react";
import { clearSession, recoverySnapshot } from "../lib/session";

export function RecoveryScreen({ message }: { message: string }) {
  const [status, setStatus] = useState("");
  const rescue = async () => {
    try {
      const rows = await recoverySnapshot();
      const json = JSON.stringify(
        rows,
        (key, value) =>
          key === "directory" || key === "html"
            ? undefined
            : value instanceof Map
              ? Object.fromEntries(value)
              : value,
        2,
      );
      const url = URL.createObjectURL(
        new Blob([json], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "depthwise-recovery.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setStatus(
        "Recovery download started. It contains private Markdown, drafts and baselines; keep it somewhere safe.",
      );
    } catch {
      setStatus(
        "Browser storage is unavailable. Keep this tab open and try again.",
      );
    }
  };
  return (
    <main className="workspace-recovery" data-ui>
      <h1>Recover your workspace</h1>
      <p>{message}</p>
      <p>
        The saved data has not been erased. Download a recovery copy before
        resetting. The recovery JSON contains raw files and drafts; it is not a
        Markdown folder import.
      </p>
      <button className="primary-button" onClick={() => void rescue()}>
        Download recovery copy
      </button>
      <button
        className="secondary-button"
        onClick={() => {
          if (
            window.confirm(
              "Erase the saved workspace, drafts, baselines and remembered folder from this browser? Download a recovery copy first.",
            )
          )
            void clearSession().then(
              () => window.location.reload(),
              () => setStatus("The saved session could not be cleared."),
            );
        }}
      >
        Forget saved session and reload
      </button>
      <p role="status">{status}</p>
    </main>
  );
}
export class AppRecovery extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <RecoveryScreen message="A rendering error stopped the app. Your saved browser data is still available for recovery." />
    ) : (
      this.props.children
    );
  }
}
