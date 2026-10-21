import {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";
import {
  assertMarkdownSize,
  buildPack,
  importFiles,
  type Pack,
} from "./lib/documents";
import {
  clearSession,
  SessionRecoveryError,
  loadSession,
  saveSession,
  updateSession,
  saveDraft,
  saveView,
  type SavedSession,
  type WorkspaceView,
} from "./lib/session";
import { nextFollowupPath, type EditorDraft } from "./lib/editing";
import {
  canWriteFolder,
  chooseWritableFolder,
  writeFolder,
  FolderSaveError,
  type DirectoryHandle,
} from "./lib/folder-access";
import { applyDraftInWorker } from "./lib/edit-worker";
import { RecoveryScreen } from "./components/AppRecovery";
const NodeEditor = lazy(() =>
  import("./components/NodeEditor").then((module) => ({
    default: module.NodeEditor,
  })),
);
import { readDroppedFiles } from "./lib/drop";
import { Icon, Mark } from "./components/Icon";
import { Modal } from "./components/Modal";
import { LandingPage, PROJECT_URL } from "./components/LandingPage";
import { WorkspaceBoundary } from "./components/WorkspaceBoundary";
const Workspace = lazy(() =>
  import("./components/Workspace").then((module) => ({
    default: memo(module.Workspace),
  })),
);
const sampleFiles = import.meta.glob(
  "../examples/database-preparation/**/*.md",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

function examplePack() {
  return buildPack(
    "database-preparation",
    Object.entries(sampleFiles).map(([path, text]) => ({
      path: path.split("database-preparation/")[1],
      text,
    })),
  );
}

export default function App() {
  const [session, setSession] = useState<SavedSession & { version: number }>();
  const [restoring, setRestoring] = useState(true);
  const [recovery, setRecovery] = useState("");
  const [applying, setApplying] = useState(false);
  const applyingRef = useRef(false);
  const draftRevision = useRef(0);
  const [home, setHome] = useState(false);
  const workspaceOpen = Boolean(session) && !home;
  const latestView = useRef<{ id: string; view: WorkspaceView } | undefined>(
    undefined,
  );
  const [draft, setDraft] = useState<EditorDraft>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"saving" | "saved" | "failed">(
    "saved",
  );
  const [editorError, setEditorError] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const [fileMessage, setFileMessage] = useState("");
  const [fileError, setFileError] = useState("");
  const [browserStatus, setBrowserStatus] = useState<
    "saving" | "saved" | "failed"
  >("saved");
  const draftRef = useRef<EditorDraft | undefined>(undefined);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [folderWriteSupported] = useState(canWriteFolder);
  const [replacement, setReplacement] = useState<Pack>();
  const [candidate, setCandidate] = useState<Pack>();
  const [entry, setEntry] = useState("");
  const [help, setHelp] = useState(false);
  const [format, setFormat] = useState(false);
  const openHelp = useCallback(() => setHelp(true), []);
  const [warnings, setWarnings] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const dragDepth = useRef(0);
  const picker = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const [directorySupported] = useState(
    () => "webkitdirectory" in window.document.createElement("input"),
  );
  useEffect(() => () => controller.current?.abort(), []);
  const storageFailure = useCallback(() => {
    setBrowserStatus("failed");
    setError(
      "Your browser couldn’t save this session. You can keep exploring, but your place may not be restored after closing the tab.",
    );
  }, []);
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      try {
        const saved = await loadSession();
        if (cancelled) return;
        if (saved) {
          const { draft: recoveredDraft, ...restored } = saved;
          setSession({ ...restored, version: ++sequence.current });
          draftRef.current = recoveredDraft;
          setDraft(recoveredDraft);
          setEditorOpen(Boolean(recoveredDraft));
        }
        if (
          new URLSearchParams(window.location.search).get("example") ===
          "database"
        ) {
          const pack = examplePack();
          if (saved) setReplacement(pack);
          else {
            const demo: SavedSession = {
              id: crypto.randomUUID(),
              pack,
              entry: "index.md",
              mode: "links",
            };
            setSession({ ...demo, version: ++sequence.current });
            void saveSession(demo).catch(storageFailure);
          }
          window.history.replaceState(null, "", window.location.pathname);
        }
      } catch (error) {
        if (!cancelled) {
          // Storage-denied profiles may still import and explore in this tab.
          if (error instanceof SessionRecoveryError) setRecovery(error.message);
          else storageFailure();
        }
      } finally {
        if (!cancelled) setRestoring(false);
      }
    };
    void restore();
    return () => {
      cancelled = true;
    };
  }, [storageFailure]);
  const currentSessionId = session?.id;
  const persistDraft = useCallback(() => {
    clearTimeout(draftTimer.current);
    if (!currentSessionId || applyingRef.current) return;
    const revision = draftRevision.current;
    const snapshot = draftRef.current;
    void saveDraft(currentSessionId, snapshot).then(
      () => {
        if (revision === draftRevision.current) setDraftStatus("saved");
      },
      () => {
        if (revision === draftRevision.current) setDraftStatus("failed");
      },
    );
  }, [currentSessionId]);
  useEffect(() => {
    const hidden = () => {
      if (document.visibilityState === "hidden") persistDraft();
    };
    window.addEventListener("pagehide", persistDraft);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      clearTimeout(draftTimer.current);
      window.removeEventListener("pagehide", persistDraft);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [persistDraft]);
  const changeDraft = (next?: EditorDraft) => {
    if (applyingRef.current) return;
    if (next) {
      try {
        assertMarkdownSize(next.text);
      } catch (error) {
        setEditorError((error as Error).message);
        return;
      }
    }
    draftRevision.current++;
    draftRef.current = next;
    setDraft(next);
    setDraftStatus("saving");
    setEditorError("");
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(persistDraft, 200);
  };
  const persistChanges = (next: SavedSession & { version: number }) => {
    setSession(next);
    setBrowserStatus("saving");
    void updateSession(next).then(
      () => setBrowserStatus("saved"),
      storageFailure,
    );
  };
  const openEditor = useCallback(
    (path: string, kind: "edit" | "add") => {
      if (!session || applyingRef.current) return;
      if (!draftRef.current) {
        const next: EditorDraft = {
          kind,
          parent: path,
          path: kind === "edit" ? path : nextFollowupPath(session.pack, path),
          text:
            kind === "edit"
              ? session.pack.documents.get(path)!.raw
              : "# New question\n\n",
        };
        draftRef.current = next;
        setDraft(next);
        setDraftStatus("saving");
        const revision = ++draftRevision.current;
        void saveDraft(session.id, next).then(
          () => {
            if (revision === draftRevision.current) setDraftStatus("saved");
          },
          () => {
            if (revision === draftRevision.current) setDraftStatus("failed");
          },
        );
      }
      setEditorError("");
      setEditorOpen(true);
    },
    [session?.pack, currentSessionId],
  );
  const applyEditor = async () => {
    if (!session || !draft || applyingRef.current) return;
    const previousBrowserStatus = browserStatus;
    let draftStored = false;
    applyingRef.current = true;
    setApplying(true);
    setBrowserStatus("saving");
    clearTimeout(draftTimer.current);
    try {
      // Queue a recovery draft before parsing/committing, including the last keystroke.
      await saveDraft(session.id, draft);
      draftStored = true;
      const result = await applyDraftInWorker(
        session.pack,
        draft,
        session.originals,
      );
      const next = {
        ...session,
        pack: result.pack,
        originals: result.originals,
      };
      clearTimeout(draftTimer.current);
      setBrowserStatus("saving");
      // Commit the updated files and remove the draft in the same transaction.
      // If storage fails, keep the editor and its text available for recovery.
      try {
        await updateSession(next, true);
      } catch {
        storageFailure();
        setEditorError(
          "The tree could not be saved in this browser. Your draft is still here; keep this tab open and copy your Markdown before leaving.",
        );
        setDraftStatus("failed");
        return;
      }
      setSession(next);
      setBrowserStatus("saved");
      draftRevision.current++;
      draftRef.current = undefined;
      setDraft(undefined);
      setDraftStatus("saved");
      setEditorOpen(false);
    } catch (error) {
      setBrowserStatus(draftStored ? previousBrowserStatus : "failed");
      setEditorError((error as Error).message);
    } finally {
      applyingRef.current = false;
      setApplying(false);
      if (draftRef.current) persistDraft();
    }
  };
  const closeEditor = () => {
    if (applyingRef.current) return;
    persistDraft();
    setEditorOpen(false);
  };
  const discardEditor = () => {
    if (applyingRef.current) return;
    changeDraft(undefined);
    persistDraft();
    setEditorOpen(false);
  };
  const saveToFolder = async (another = false) => {
    if (!session) return;
    setFileBusy(true);
    setFileError("");
    setFileMessage("");
    let directory: DirectoryHandle | undefined;
    try {
      directory =
        !another && session.directory
          ? session.directory
          : await chooseWritableFolder();
      const saved = await writeFolder(
        directory,
        session.pack,
        session.originals ?? {},
      );
      const originals = { ...session.originals };
      for (const path of saved) delete originals[path];
      persistChanges({ ...session, directory, originals });
      setFileMessage(
        saved.length
          ? `Saved ${saved.length} Markdown file(s) to ${directory.name}.`
          : "No pending changes to save. Choose an empty folder to save a complete copy.",
      );
    } catch (error) {
      if (error instanceof FolderSaveError && directory) {
        persistChanges({ ...session, directory, originals: error.pending });
      }
      if ((error as DOMException).name !== "AbortError")
        setFileError((error as Error).message);
    } finally {
      setFileBusy(false);
    }
  };
  const download = async () => {
    if (!session) return;
    setFileBusy(true);
    setFileError("");
    setFileMessage("");
    try {
      const { exportPack } = await import("./lib/export");
      await exportPack(session.pack);
      setFileMessage(
        "ZIP download started. Your Markdown files and folder structure are included.",
      );
    } catch (error) {
      setFileError(`Could not create ZIP: ${(error as Error).message}`);
    } finally {
      setFileBusy(false);
    }
  };
  const saveWorkspace = useCallback(
    (view: WorkspaceView) => {
      if (currentSessionId) {
        latestView.current = { id: currentSessionId, view };
        void saveView(currentSessionId, view).catch(storageFailure);
      }
    },
    [currentSessionId, storageFailure],
  );
  const forgetSession = async () => {
    try {
      await clearSession();
      setSession(undefined);
      draftRef.current = undefined;
      setDraft(undefined);
      clearTimeout(draftTimer.current);
      setHelp(false);
      window.history.replaceState(null, "", window.location.pathname);
    } catch {
      setError(
        "Your browser couldn’t clear the saved session. Please try again.",
      );
    }
  };
  const activate = (pack: Pack, root: string, mode: "links" | "folders") => {
    const next: SavedSession = {
      id: crypto.randomUUID(),
      pack,
      entry: root,
      mode,
    };
    // Queue the folder write before the workspace can start saving navigation.
    void saveSession(next).catch(storageFailure);
    latestView.current = undefined;
    draftRef.current = undefined;
    setDraft(undefined);
    clearTimeout(draftTimer.current);
    setBrowserStatus("saved");
    setFileMessage("");
    setFileError("");
    setHome(false);
    setSession({ ...next, version: ++sequence.current });
    setCandidate(undefined);
    setError("");
  };
  const preparePack = (pack: Pack) => {
    const root = pack.documents.get("index.md");
    if (root && (root.children.length || pack.documents.size === 1))
      activate(pack, "index.md", "links");
    else {
      setCandidate(pack);
      setEntry(root ? "index.md" : pack.documents.keys().next().value!);
    }
  };
  const accept = (pack: Pack) => {
    if (draftRef.current || Object.keys(session?.originals ?? {}).length) {
      persistDraft();
      setFileMessage("");
      setFileError("");
      setReplacement(pack);
    } else preparePack(pack);
  };
  const select = async (
    input:
      | File[]
      | ((
          signal: AbortSignal,
          progress: (value: string) => void,
        ) => Promise<File[]>),
  ) => {
    if (Array.isArray(input) && !input.length) return;
    controller.current?.abort();
    const task = new AbortController();
    controller.current = task;
    setError("");
    setProgress("Reading Markdown folder…");
    try {
      const files =
        typeof input === "function"
          ? await input(task.signal, setProgress)
          : input;
      const pack = await importFiles(files, task.signal, setProgress);
      if (!task.signal.aborted) accept(pack);
    } catch (issue) {
      if (!task.signal.aborted) setError((issue as Error).message);
    } finally {
      if (controller.current === task) {
        setProgress("");
        controller.current = null;
      }
    }
  };
  const fileDrag = (event: DragEvent) =>
    event.dataTransfer.types.includes("Files");
  const drop = (event: DragEvent) => {
    if (!fileDrag(event)) return;
    event.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    if (workspaceOpen || progress || restoring) return;
    const transfer = event.dataTransfer;
    void select((signal, update) => readDroppedFiles(transfer, signal, update));
  };
  useEffect(() => {
    const reset = () => {
      dragDepth.current = 0;
      setDragActive(false);
    };
    window.addEventListener("dragend", reset);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("dragend", reset);
      window.removeEventListener("blur", reset);
    };
  }, []);
  const demo = () => accept(examplePack());
  if (recovery) return <RecoveryScreen message={recovery} />;
  return (
    <>
      {applying && (
        <div className="operation-progress" role="status">
          Updating your tree… Your draft is kept while saving.
        </div>
      )}
      <div inert={applying || undefined} aria-busy={applying} className="app">
        <a className="skip-link" href="#main">
          Skip to learning workspace
        </a>
        <header
          className={`app-header ${workspaceOpen ? "app-header-loaded" : "app-header-landing"}`}
        >
          <a
            href="./"
            className="brand"
            translate="no"
            aria-label="Depthwise home"
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              event.preventDefault();
              setHome(true);
            }}
          >
            <Mark />
            <span>
              depthwise<span className="brand-period">.</span>
            </span>
          </a>
          {workspaceOpen ? (
            <div id="workspace-header" className="header-workspace" />
          ) : (
            <nav className="landing-nav" aria-label="Project navigation">
              <a href="#project">The project</a>
              <a href="#skill">The skill</a>
              <a href={PROJECT_URL} target="_blank" rel="noreferrer">
                GitHub <span aria-hidden="true">↗</span>
              </a>
            </nav>
          )}
          <div className="header-actions">
            {workspaceOpen &&
              session &&
              (session.pack.warnings.length > 0 ||
                session.pack.ignored > 0) && (
                <button
                  className="warning-button"
                  onClick={() => setWarnings(true)}
                >
                  <Icon name="warning" size={15} />
                  {session.pack.warnings.length
                    ? `${session.pack.warnings.length} warnings`
                    : "Import notes"}
                </button>
              )}
            <button
              className="icon-button header-help"
              aria-label="Help and keyboard shortcuts"
              title="Help and keyboard shortcuts"
              onClick={() => setHelp(true)}
            >
              <Icon name="help" />
            </button>
            <button
              className="open-folder-button"
              onClick={() => picker.current?.click()}
              disabled={Boolean(progress) || restoring}
            >
              <Icon name="folder" size={16} />
              <span>
                {workspaceOpen ? "Open another folder" : "Open Markdown folder"}
              </span>
            </button>
          </div>
        </header>
        <input
          className="visually-hidden"
          ref={picker}
          type="file"
          name="markdown-folder"
          multiple
          {...(directorySupported
            ? { webkitdirectory: "", directory: "" }
            : {})}
          aria-label="Choose Markdown folder"
          onChange={(event) => {
            void select(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
        {!directorySupported && (
          <p className="compatibility-notice" role="status">
            Folder selection is unavailable in this browser. Multi-file
            selection cannot preserve nested folders. Use a browser with
            directory selection for nested packs.
          </p>
        )}
        <main
          id="main"
          tabIndex={-1}
          className={workspaceOpen ? "main-loaded" : "main-empty"}
          onDragEnter={(event) => {
            if (!fileDrag(event) || workspaceOpen || progress || restoring)
              return;
            event.preventDefault();
            dragDepth.current++;
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            if (!fileDrag(event)) return;
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (!dragDepth.current) setDragActive(false);
          }}
          onDragOver={(event) => {
            if (!fileDrag(event)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect =
              workspaceOpen || progress || restoring ? "none" : "copy";
          }}
          onDrop={drop}
        >
          {restoring ? (
            <div className="loading-workspace" role="status">
              Restoring your session…
            </div>
          ) : session && !home ? (
            <>
              <div className="workspace-savebar">
                <span role="status">
                  {browserStatus === "saving"
                    ? "Saving in browser…"
                    : browserStatus === "failed"
                      ? "Browser save failed"
                      : "Saved in browser"}
                  <span className="savebar-detail">
                    {" "}
                    ·{" "}
                    {Object.keys(session.originals ?? {}).length
                      ? `${Object.keys(session.originals!).length} modified file(s)`
                      : "Markdown workspace"}
                  </span>
                </span>
                <div>
                  {draft && (
                    <button onClick={() => setEditorOpen(true)}>
                      Resume draft
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSaveOpen(true);
                      setFileError("");
                      setFileMessage("");
                    }}
                  >
                    <Icon name="download" size={16} />
                    Save &amp; export
                  </button>
                </div>
              </div>
              <div className="workspace-container">
                <Suspense
                  fallback={
                    <div className="loading-workspace" role="status">
                      Opening question tree…
                    </div>
                  }
                >
                  <WorkspaceBoundary key={session.version}>
                    <Workspace
                      key={session.version}
                      pack={session.pack}
                      entry={session.entry}
                      mode={session.mode}
                      onHelp={openHelp}
                      initialView={session.view}
                      onSave={saveWorkspace}
                      onEdit={openEditor}
                      editor={
                        draft?.kind === "edit"
                          ? {
                              draft,
                              open: editorOpen,
                              saving: draftStatus,
                              busy: applying,
                              error: editorError,
                              onChange: changeDraft,
                              onClose: closeEditor,
                              onApply: applyEditor,
                              onDiscard: discardEditor,
                            }
                          : undefined
                      }
                    />
                  </WorkspaceBoundary>
                </Suspense>
              </div>
            </>
          ) : (
            <LandingPage
              dragActive={dragActive}
              busy={Boolean(progress) || restoring}
              onBrowse={() => picker.current?.click()}
              onExample={demo}
              onFormat={() => setFormat(true)}
              resumeName={session?.pack.name}
              onResume={
                session
                  ? () => {
                      setSession({
                        ...session,
                        view:
                          latestView.current?.id === session.id
                            ? latestView.current.view
                            : session.view,
                        version: ++sequence.current,
                      });
                      setHome(false);
                    }
                  : undefined
              }
            />
          )}
        </main>
        {draft?.kind === "add" && (
          <Suspense fallback={null}>
            <NodeEditor
              key={`${draft.kind}:${draft.parent}`}
              draft={draft}
              open={editorOpen}
              saving={draftStatus}
              busy={applying}
              error={editorError}
              onChange={changeDraft}
              onClose={closeEditor}
              onApply={applyEditor}
              onDiscard={discardEditor}
            />
          </Suspense>
        )}
        <Modal
          open={Boolean(replacement)}
          onClose={() => {
            if (!fileBusy) setReplacement(undefined);
          }}
          title="Replace this workspace?"
          description="Your current workspace has edits or a draft saved only in this browser. Opening another folder replaces that browser copy."
        >
          <div className="save-options">
            <button
              className="secondary-button"
              disabled={fileBusy}
              onClick={() => void download()}
            >
              Download current tree as ZIP
            </button>
            {draft && (
              <p>
                The ZIP contains applied changes. Keep this workspace and finish
                your draft first if you want to include it.
              </p>
            )}
            <button
              className="text-link"
              disabled={fileBusy}
              onClick={() => setReplacement(undefined)}
            >
              Keep current workspace
            </button>
            <button
              className="primary-button"
              disabled={fileBusy}
              onClick={() => {
                const next = replacement;
                setReplacement(undefined);
                if (next) preparePack(next);
              }}
            >
              Open new folder
            </button>
            {fileMessage && <p role="status">{fileMessage}</p>}
            {fileError && (
              <p className="editor-error" role="alert">
                {fileError}
              </p>
            )}
          </div>
        </Modal>
        <Modal
          open={saveOpen}
          onClose={() => {
            if (!fileBusy) setSaveOpen(false);
          }}
          title="Save your Markdown"
          description="Your browser keeps your working copy. Export it to keep the files outside this browser."
        >
          <div className="save-options">
            {draft && (
              <p className="warning-text">
                A draft is waiting. Use Update tree or Add to tree in the editor
                to include it in saved files.
              </p>
            )}
            <button
              className="primary-button"
              onClick={() => void download()}
              disabled={fileBusy}
            >
              <Icon name="download" />
              Download ZIP
            </button>
            <p>
              All Markdown files, with their current folder structure. Works
              across browsers.
            </p>
            <p>
              Folder saves can stop partway through. Avoid editing the same
              files in another app during a save: browser locks cannot exclude
              every external writer. For important work, prefer a ZIP or a new
              empty folder. Recovery copies may contain older sensitive text.
            </p>
            {folderWriteSupported ? (
              <>
                <button
                  className="secondary-button"
                  onClick={() => void saveToFolder()}
                  disabled={fileBusy}
                >
                  <Icon name="folder" />
                  Save to folder
                </button>
                <p>
                  {session?.directory
                    ? `Connected to ${session.directory.name}. Saves changed files after checking for external edits; recovery copies go in .depthwise-backups.`
                    : "Choose your original folder to save changes, or an empty folder for a complete copy. Your browser will request write access. Existing files get recovery copies in .depthwise-backups; these stay until you delete them."}
                </p>
                {session?.directory && (
                  <button
                    className="text-link"
                    onClick={() => void saveToFolder(true)}
                    disabled={fileBusy}
                  >
                    Choose another folder
                  </button>
                )}
              </>
            ) : (
              <p>
                Direct folder saving isn’t available in this browser. Download
                the ZIP to keep your changes.
              </p>
            )}
            {fileBusy && <p role="status">Preparing your files…</p>}
            {fileMessage && <p role="status">{fileMessage}</p>}
            {fileError && (
              <p className="editor-error" role="alert">
                {fileError}
              </p>
            )}
          </div>
        </Modal>
        {progress && (
          <div className="import-progress" role="status">
            <span className="progress-indicator" />
            {progress}
            <button onClick={() => controller.current?.abort()}>
              Cancel import
            </button>
          </div>
        )}
        {error && (
          <div className="error-banner" role="alert">
            <Icon name="warning" />
            <span>{error}</span>
            <button
              className="icon-button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              <Icon name="close" />
            </button>
          </div>
        )}
        <Modal
          open={Boolean(candidate)}
          onClose={() => setCandidate(undefined)}
          title="Choose your starting point"
          description="This folder has no linked entry tree. Choose a Markdown entry or browse its folder structure."
        >
          {candidate && (
            <div className="import-options">
              <label htmlFor="entry-file">Entry file</label>
              <select
                id="entry-file"
                name="entry-file"
                value={entry}
                onChange={(event) => setEntry(event.target.value)}
              >
                {[...candidate.documents.values()].map((doc) => (
                  <option key={doc.path} value={doc.path}>
                    {doc.path}
                  </option>
                ))}
              </select>
              <button
                className="primary-button"
                onClick={() => activate(candidate, entry, "links")}
              >
                Open selected entry
              </button>
              <button
                className="secondary-button"
                onClick={() => activate(candidate, entry, "folders")}
              >
                Browse folder-derived tree
              </button>
              <small>
                Folder-derived mode uses directories as groups. It does not
                infer learning relationships.
              </small>
            </div>
          )}
        </Modal>
        <Modal
          open={warnings}
          onClose={() => setWarnings(false)}
          title="Folder warnings"
          description="Valid branches remain usable. Use Edit in a node to fix its Markdown links, or change the source files and reimport."
        >
          <div className="diagnostics">
            {session?.pack.warnings.map((warning, i) => (
              <div key={i}>
                <strong>{warning.file}</strong>
                <p>{warning.message}</p>
              </div>
            ))}
          </div>
          {session && session.pack.ignored > 0 && (
            <p>
              {session.pack.ignored} unsupported or hidden files were ignored.
            </p>
          )}
        </Modal>
        <Modal
          open={help}
          onClose={() => setHelp(false)}
          title="A little orientation"
          description="Open a question to read its Markdown and reveal the next branches."
        >
          <dl className="shortcuts">
            <div>
              <dt>Enter / Space</dt>
              <dd>Open or collapse a question</dd>
            </div>
            <div>
              <dt>← / →</dt>
              <dd>Parent / first child</dd>
            </div>
            <div>
              <dt>↑ / ↓</dt>
              <dd>Previous / next sibling</dd>
            </div>
            <div>
              <dt>Home</dt>
              <dd>Return focus to the root</dd>
            </div>
            <div>
              <dt>Drag the background</dt>
              <dd>Move through the tree</dd>
            </div>
            <div>
              <dt>Scroll / pinch</dt>
              <dd>Zoom the workspace</dd>
            </div>
          </dl>
          <p className="muted">
            Arrow shortcuts apply when a question control has keyboard focus.
            Scroll inside an expanded preview to read long files.
          </p>
          <div className="help-links">
            <button
              onClick={() => {
                setHelp(false);
                setFormat(true);
              }}
            >
              Folder format →
            </button>
            <a href="./depthwise-question-tree-SKILL.md" download>
              Download authoring skill →
            </a>
          </div>
          <p className="session-note">
            Your latest folder and exploring position are saved in this browser.
            Reopen Depthwise to continue where you left off. Clearing browser
            data removes the saved session.
          </p>
          {session && (
            <button className="text-link" onClick={() => void forgetSession()}>
              Forget saved session
            </button>
          )}
        </Modal>
        <Modal
          open={format}
          onClose={() => setFormat(false)}
          title="A folder. A few good questions."
          description="Use ordinary Markdown files and relative links. No manifest needed."
        >
          <div className="format-help">
            <pre>
              {"my-topic/\n├── index.md\n├── foundations.md\n└── trade-offs.md"}
            </pre>
            <p>
              Use one H1 question per file. Link child files under this exact
              H2:
            </p>
            <pre>
              {
                "# How does this work?\n\nStart with a question, then follow links to explore related ideas.\n\n## Explore\n- What problem does it solve?\n\n## Follow-up questions\n- [What are the foundations?](foundations.md)"
              }
            </pre>
            <p>
              Links resolve from their file’s folder. Keep every child reachable
              from <code>index.md</code>, with one parent and no cycles. Other
              Markdown folders can be browsed using their directories.
            </p>
            <p className="muted">
              Up to 1,000 Markdown files, 1 MiB per file, 20 MiB total. UTF-8
              only. Other files are ignored.
            </p>
          </div>
        </Modal>
      </div>
    </>
  );
}
