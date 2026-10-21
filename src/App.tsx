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
import { buildPack, importFiles, type Pack } from "./lib/documents";
import {
  clearSession,
  loadSession,
  saveSession,
  saveView,
  type SavedSession,
  type WorkspaceView,
} from "./lib/session";
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
  const [home, setHome] = useState(false);
  const workspaceOpen = Boolean(session) && !home;
  const latestView = useRef<{ id: string; view: WorkspaceView } | undefined>(
    undefined,
  );
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
    setError(
      "Your browser couldn’t save this session. You can keep exploring, but your place may not be restored after closing the tab.",
    );
  }, []);
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      try {
        if (
          new URLSearchParams(window.location.search).get("example") ===
          "database"
        ) {
          const demo: SavedSession = {
            id: crypto.randomUUID(),
            pack: examplePack(),
            entry: "index.md",
            mode: "links",
          };
          if (cancelled) return;
          setSession({ ...demo, version: ++sequence.current });
          void saveSession(demo).catch(storageFailure);
          window.history.replaceState(null, "", window.location.pathname);
        } else {
          const saved = await loadSession();
          if (saved && !cancelled)
            setSession({ ...saved, version: ++sequence.current });
        }
      } catch {
        if (!cancelled) storageFailure();
      } finally {
        if (!cancelled) setRestoring(false);
      }
    };
    void restore();
    return () => {
      cancelled = true;
    };
  }, [storageFailure]);
  const saveWorkspace = useCallback(
    (view: WorkspaceView) => {
      if (session) {
        latestView.current = { id: session.id, view };
        void saveView(session.id, view).catch(storageFailure);
      }
    },
    [session, storageFailure],
  );
  const forgetSession = async () => {
    try {
      await clearSession();
      setSession(undefined);
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
    setHome(false);
    setSession({ ...next, version: ++sequence.current });
    setCandidate(undefined);
    setError("");
  };
  const accept = (pack: Pack) => {
    const root = pack.documents.get("index.md");
    if (root && (root.children.length || pack.documents.size === 1))
      activate(pack, "index.md", "links");
    else {
      setCandidate(pack);
      setEntry(root ? "index.md" : pack.documents.keys().next().value!);
    }
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
  return (
    <div className="app">
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
            (session.pack.warnings.length > 0 || session.pack.ignored > 0) && (
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
        {...(directorySupported ? { webkitdirectory: "", directory: "" } : {})}
        aria-label="Choose Markdown folder"
        onChange={(event) => {
          void select(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      {!directorySupported && (
        <p className="compatibility-notice" role="status">
          Folder selection is unavailable in this browser. Multi-file selection
          cannot preserve nested folders. Use a browser with directory selection
          for nested packs.
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
              />
            </WorkspaceBoundary>
          </Suspense>
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
              Folder-derived mode uses directories as groups. It does not infer
              learning relationships.
            </small>
          </div>
        )}
      </Modal>
      <Modal
        open={warnings}
        onClose={() => setWarnings(false)}
        title="Folder warnings"
        description="Valid branches remain usable. Edit the source Markdown and reimport to fix these links."
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
          Reopen Depthwise to continue where you left off. Clearing browser data
          removes the saved session.
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
            Use one H1 question per file. Link child files under this exact H2:
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
  );
}
