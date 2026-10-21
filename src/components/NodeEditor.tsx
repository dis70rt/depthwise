import { useMemo, useState } from "react";
import { parseDocument } from "../lib/documents";
import type { EditorDraft } from "../lib/editing";
import { Markdown } from "./Markdown";
import { Modal } from "./Modal";

export interface NodeEditorProps {
  draft: EditorDraft;
  open: boolean;
  inline?: boolean;
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
  error,
  onChange,
  onClose,
  onApply,
  onDiscard,
}: NodeEditorProps) {
  const [preview, setPreview] = useState(false);
  const document = useMemo(
    () =>
      preview
        ? parseDocument(draft.path || "draft.md", draft.text, [])
        : undefined,
    [preview, draft.path, draft.text],
  );
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
          <button aria-pressed={!preview} onClick={() => setPreview(false)}>
            Write
          </button>
          <button aria-pressed={preview} onClick={() => setPreview(true)}>
            Preview
          </button>
        </div>
        <span
          role="status"
          className={saving === "failed" ? "warning-text" : "editor-status"}
        >
          {saving === "saved"
            ? "Draft saved in browser"
            : saving === "failed"
              ? "Draft not saved — keep this tab open"
              : "Saving draft…"}
        </span>
      </div>
      {preview ? (
        <div className="editor-preview">
          {document && <Markdown document={document} navigate={() => {}} />}
        </div>
      ) : (
        <>
          <label className="visually-hidden" htmlFor="editor-markdown">
            Markdown
          </label>
          <textarea
            id="editor-markdown"
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
        <button className="text-link" onClick={onDiscard}>
          Discard draft
        </button>
        <button className="secondary-button" onClick={onClose}>
          Keep draft
        </button>
        <button className="primary-button" onClick={onApply}>
          {draft.kind === "add" ? "Add to tree" : "Update tree"}
        </button>
      </div>
      <p className="editor-note">
        Updates stay in this browser until you save to a folder or download a
        ZIP. The first H1 supplies the question; other Markdown is yours to
        format.
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
