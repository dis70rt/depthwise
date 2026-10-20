import { Component, type ReactNode } from "react";

/** Preserve the imported pack (owned by App) if a renderer/layout fails. */
export class WorkspaceBoundary extends Component<
  { children: ReactNode },
  { failed: boolean; attempt: number }
> {
  state = { failed: false, attempt: 0 };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="workspace-recovery" role="alert">
          <h1>The tree could not be drawn.</h1>
          <p>
            Your imported folder is still open. Reset the view to try again.
          </p>
          <button
            className="primary-button"
            onClick={() =>
              this.setState((previous) => ({
                failed: false,
                attempt: previous.attempt + 1,
              }))
            }
          >
            Reset tree view
          </button>
        </div>
      );
    return (
      <div key={this.state.attempt} style={{ height: "100%" }}>
        {this.props.children}
      </div>
    );
  }
}
