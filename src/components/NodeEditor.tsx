import { useEffect, useState } from "react";
import {
  assertMarkdownSize,
  LIMITS,
  parseSourcesInWorker,
  type Document,
} from "../lib/documents";
import type { EditorDraft } from "../lib/editing";
import { Markdown } from "./Markdown";
import { Modal } from "./Modal";

export interface NodeEditorProps {
  draft: EditorDraft;
  open: boolean;
  inline?: boolean;
  busy?: boolean;
  persistent?: boolean;
  saving: "saving" | "saved" | "failed";
  error: string;
  onChange: (draft: EditorDraft) => void;
  onClose: () => void;
  onApply: () => void;
  onDiscard: () => void;
}

export function NodeEditor({
  draft,
  open,
  inline = false,
  saving,
  busy = false,
  persistent = true,
  error,
  onChange,
  onClose,
  onApply,
  onDiscard,
}: NodeEditorProps) {
  const [preview, setPreview] = useState(false);
  const [document, setDocument] = useState<Document>();
  const [previewError, setPreviewError] = useState("");
  useEffect(() => {
    setDocument(undefined);
    setPreviewError("");
    if (!preview) return;
    const controller = new AbortController();
    try {
      assertMarkdownSize(draft.text);
      void parseSourcesInWorker(
        "Preview",
        [{ path: draft.path || "draft.md", text: draft.text }],
        0,
        controller.signal,
      ).then(
        (pack) => {
          if (!controller.signal.aborted)
            setDocument(pack.documents.values().next().value);
        },
        (error) => {
          if (!controller.signal.aborted) setPreviewError(error.message);
        },
      );
    } catch (error) {
      setPreviewError((error as Error).message);
    }
    return () => controller.abort();
  }, [preview, draft.path, draft.text]);
  const content = (
    <div
      className={`node-editor no-pan ${inline ? "node-editor-inline" : ""}`}
      data-ui
      onPointerDown={(event) => event.stopPropagation()}
    >
      {!inline && (
        <>
          <label htmlFor="editor-path">New file path</label>
          <input
            id="editor-path"
            maxLength={LIMITS.pathLength}
            disabled={busy}
            value={draft.path}
            onChange={(event) =>
              onChange({ ...draft, path: event.target.value })
            }
            spellCheck={false}
            autoComplete="off"
          />
        </>
      )}
      <div className="editor-toolbar">
        <div className="editor-tabs" role="group" aria-label="Editor view">
          <button
            disabled={busy}
            aria-pressed={!preview}
            onClick={() => setPreview(false)}
          >
            Write
          </button>
          <button
            disabled={busy}
            aria-pressed={preview}
            onClick={() => setPreview(true)}
          >
            Preview
          </button>
        </div>
        <span
          role="status"
          className={saving === "failed" ? "warning-text" : "editor-status"}
        >
          {busy
            ? "Updating tree…"
            : !persistent
              ? "Draft kept in this tab only"
              : saving === "saved"
                ? "Draft saved in browser"
                : saving === "failed"
                  ? "Draft not saved — keep this tab open"
                  : "Saving draft…"}
        </span>
      </div>
      {preview ? (
        <div className="editor-preview">
          {document ? (
            <Markdown document={document} navigate={() => {}} />
          ) : (
            <p role={previewError ? "alert" : "status"}>
              {previewError || "Preparing preview…"}
            </p>
          )}
        </div>
      ) : (
        <>
          <label className="visually-hidden" htmlFor="editor-markdown">
            Markdown
          </label>
          <textarea
            id="editor-markdown"
            disabled={busy}
            autoFocus={inline}
            value={draft.text}
            onChange={(event) =>
              onChange({ ...draft, text: event.target.value })
            }
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
          />
        </>
      )}
      {error && (
        <p className="editor-error" role="alert">
          {error}
        </p>
      )}
      <div className="editor-actions">
        <button disabled={busy} className="text-link" onClick={onDiscard}>
          Discard draft
        </button>
        <button disabled={busy} className="secondary-button" onClick={onClose}>
          Keep draft
        </button>
        <button disabled={busy} className="primary-button" onClick={onApply}>
          {draft.kind === "add" ? "Add to tree" : "Update tree"}
        </button>
      </div>
      <p className="editor-note">
        Updates stay {persistent ? "in this browser" : "in this tab only"} until
        you save to a folder or download a ZIP. The first H1 supplies the
        question; other Markdown is yours to format.
      </p>
    </div>
  );
  if (inline) return open ? content : null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a follow-up"
      description={`Create a Markdown file and link it from ${draft.parent}.`}
      wide
    >
      {content}
    </Modal>
  );
}
