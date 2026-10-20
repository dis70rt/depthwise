import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import type { Pack, Document as MarkdownDocument } from "../lib/documents";
import { findPath, resolveLink, reachable } from "../lib/documents";
import {
  activePath,
  folderAncestors,
  layoutTree,
  makeTree,
  type Position,
  type TreeNode,
} from "../lib/tree";
import { Markdown } from "./Markdown";
import { Outline } from "./Outline";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

function Branches({
  nodes,
  positions,
  path,
}: {
  nodes: Map<string, TreeNode>;
  positions: Map<string, Position>;
  path: Set<string>;
}) {
  const edges = [];
  for (const child of nodes.values()) {
    if (!child.parent) continue;
    const parent = positions.get(child.parent);
    const target = positions.get(child.id);
    if (!parent || !target) continue;
    const start = parent.x + parent.width;
    const end = target.x;
    const bend = Math.max(40, (end - start) * 0.5);
    const active = path.has(child.id) && path.has(child.parent);
    edges.push(
      <g
        key={child.id}
        className={`branch-group ${active ? "branch-active" : ""}`}
        data-from={child.parent}
        data-to={child.id}
      >
        <path
          className="branch-line"
          pathLength={1}
          d={`M ${start} ${parent.center} C ${start + bend} ${parent.center}, ${end - bend} ${target.center}, ${end} ${target.center}`}
        />
        <circle className="branch-port" cx={end} cy={target.center} r={3.5} />
      </g>,
    );
  }
  return (
    <svg className="branches" aria-hidden="true" width="100%" height="100%">
      {edges}
    </svg>
  );
}

function FileNode({
  node,
  doc,
  open,
  focused,
  onPath,
  opening,
  position,
  measure,
  toggle,
  focus,
  navigate,
  onKey,
  onSection,
  scrolls,
  warningCount,
}: {
  node: TreeNode;
  doc?: MarkdownDocument;
  open: boolean;
  focused: boolean;
  onPath: boolean;
  opening: boolean;
  position: Position;
  measure: (id: string, height: number) => void;
  toggle: (id: string) => void;
  focus: (id: string) => void;
  navigate: (id: string, href: string) => void;
  onKey: (event: KeyboardEvent, id: string) => void;
  onSection: (id: string, heading: string) => void;
  scrolls: React.RefObject<Map<string, number>>;
  warningCount: number;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const nav = useCallback(
    (href: string) => navigate(node.id, href),
    [navigate, node.id],
  );
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) =>
      measure(
        node.id,
        entries[0].borderBoxSize?.[0]?.blockSize ??
          entries[0].contentRect.height,
      ),
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [measure, node.id]);
  useEffect(() => {
    if (scroll.current)
      scroll.current.scrollTop = scrolls.current.get(node.id) ?? 0;
  }, [node.id, scrolls, open]);
  const section = () => {
    if (!scroll.current || !doc) return;
    scrolls.current.set(node.id, scroll.current.scrollTop);
    const top = scroll.current.getBoundingClientRect().top + 36;
    let current = doc.headings[0]?.id ?? "";
    for (const h of scroll.current.querySelectorAll<HTMLElement>("[id]"))
      if (h.getBoundingClientRect().top <= top) current = h.id;
    onSection(node.id, current);
  };
  return (
    <motion.article
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.24 }}
      ref={ref}
      id={`node-${encodeURIComponent(node.id)}`}
      className={`file-node ${open ? "node-open" : ""} ${focused ? "node-focused" : ""} ${onPath ? "node-on-path" : ""} ${opening ? "node-opening" : ""} ${node.reference || node.missing ? "node-reference" : ""}`}
      style={{
        width: position.width,
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
      aria-label={node.title}
      data-node-id={node.id}
      data-path={node.path}
      data-opening={opening || undefined}
    >
      <button
        className="node-toggle"
        aria-expanded={open}
        aria-controls={
          doc && open ? `preview-${encodeURIComponent(node.id)}` : undefined
        }
        aria-label={`${open ? "Collapse" : "Expand"} ${node.title}`}
        onClick={() => toggle(node.id)}
        onFocus={() => focus(node.id)}
        onKeyDown={(event) => onKey(event, node.id)}
      >
        <span className="node-question">{node.title}</span>
        <span className="node-sign" aria-hidden="true">
          {node.reference ? (
            "↩"
          ) : node.missing ? (
            "!"
          ) : (
            <Icon name="chevron" size={17} />
          )}
        </span>
      </button>
      {node.reference || node.missing ? (
        <p className="reference-label">
          {node.reference
            ? "Ancestor reference · branch stops here"
            : "Missing or invalid Markdown target"}
        </p>
      ) : null}
      <AnimatePresence initial={false}>
        {doc && open && (
          <motion.div
            id={`preview-${encodeURIComponent(node.id)}`}
            key="preview"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div className="node-meta">
              <span>
                <Icon name="file" size={12} />
                {doc.path}
              </span>
              {warningCount > 0 && (
                <span className="warning-text">
                  {warningCount} {warningCount === 1 ? "warning" : "warnings"}
                </span>
              )}
            </div>
            <div
              className="preview no-pan"
              ref={scroll}
              tabIndex={open ? 0 : -1}
              onScroll={section}
              role="region"
              aria-label={`Markdown preview: ${doc.title}`}
              onPointerDown={() => focus(node.id)}
              onFocus={() => focus(node.id)}
            >
              <Markdown document={doc} navigate={nav} />
            </div>
            <div className="node-footer">
              <span>
                {doc.children.length
                  ? `${doc.children.length} follow-up ${doc.children.length === 1 ? "question" : "questions"}`
                  : "End of this branch"}
              </span>
              <button onClick={() => toggle(node.id)}>
                Collapse <span aria-hidden="true">−</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!doc && open && !node.reference && !node.missing ? (
        <p className="folder-note">Folder-derived branches</p>
      ) : null}
    </motion.article>
  );
}

export function Workspace({
  pack,
  entry,
  mode,
  onHelp,
  initialHeading,
}: {
  pack: Pack;
  initialHeading?: string;
  entry: string;
  mode: "links" | "folders";
  onHelp: () => void;
}) {
  const root = mode === "links" ? JSON.stringify([entry]) : "@folder";
  const [expanded, setExpanded] = useState(() => new Set([root]));
  const [focused, setFocused] = useState(root);
  const [opening, setOpening] = useState<string>();
  const destination = useRef<{
    id: string;
    heading?: string;
    ancestors: string[];
  } | null>(null);
  const transition = useRef(0);
  const openingNode = useRef<string | undefined>(undefined);
  const expansionAnchor = useRef<{
    id: string;
    x: number;
    y: number;
    zoom: number;
  } | null>(null);
  const [measured, setMeasured] = useState<Map<string, number>>(
    () => new Map(),
  );
  const [compact, setCompact] = useState(() => window.innerWidth < 760);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [activeHeading, setActiveHeading] = useState("");
  const [scale, setScale] = useState(1);
  const viewport = useRef<ReactZoomPanPinchRef>(null);
  const host = useRef<HTMLDivElement>(null);
  const scrolls = useRef(new Map<string, number>());
  const pending = useRef<{
    id: string;
    heading?: string;
    keyboard?: boolean;
    positioned?: boolean;
  } | null>(null);
  const reduced = useReducedMotion();
  const tree = useMemo(
    () => makeTree(pack, entry, mode, expanded),
    [pack, entry, mode, expanded],
  );
  const layout = useMemo(
    () => layoutTree(tree, expanded, measured, compact),
    [tree, expanded, measured, compact],
  );
  const [positions, setPositions] = useState(layout.positions);
  const rendered = useRef(layout.positions);
  const path = useMemo(
    () => activePath(tree.nodes, focused),
    [tree.nodes, focused],
  );
  const current = tree.nodes.get(focused);
  const document = current?.path ? pack.documents.get(current.path) : undefined;
  const reached = useMemo(() => reachable(pack, entry), [pack, entry]);
  const unlinked = [...pack.documents.keys()].filter(
    (path) => !reached.has(path),
  );
  const warnings = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of pack.warnings) map.set(w.file, (map.get(w.file) ?? 0) + 1);
    return map;
  }, [pack]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 759px)");
    const change = () => setCompact(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    const from = rendered.current;
    const target = layout.positions;
    const animation = animate(0, 1, {
      duration: reduced ? 0 : 0.26,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (progress) => {
        const next = new Map<string, Position>();
        for (const [id, to] of target) {
          const old = from.get(id) ?? { ...to, x: to.x - 12 };
          const x = old.x + (to.x - old.x) * progress;
          const y = old.y + (to.y - old.y) * progress;
          const width = old.width + (to.width - old.width) * progress;
          next.set(id, { ...to, x, y, width, center: y + to.height / 2 });
        }
        const anchor = expansionAnchor.current;
        const pinned = anchor && next.get(anchor.id);
        if (anchor && pinned)
          void viewport.current?.setTransform(
            anchor.x - pinned.x * anchor.zoom,
            anchor.y - pinned.y * anchor.zoom,
            anchor.zoom,
            0,
          );
        rendered.current = next;
        setPositions(next);
      },
    });
    return () => animation.stop();
  }, [layout, reduced]);
  const measure = useCallback(
    (id: string, height: number) =>
      setMeasured((previous) => {
        const rounded = Math.round(height);
        if (previous.get(id) === rounded) return previous;
        const next = new Map(previous);
        next.set(id, rounded);
        return next;
      }),
    [],
  );
  const cancelOpening = useCallback(() => {
    transition.current++;
    destination.current = null;
    openingNode.current = undefined;
    expansionAnchor.current = null;
    pending.current = null;
    setOpening(undefined);
  }, []);
  useEffect(
    () => () => {
      transition.current++;
    },
    [],
  );
  const focus = useCallback(
    (id: string) => {
      if (openingNode.current && openingNode.current !== id) cancelOpening();
      if (expansionAnchor.current?.id !== id) expansionAnchor.current = null;
      setFocused(id);
      if (!openingNode.current && pending.current?.id !== id)
        pending.current = { id };
    },
    [cancelOpening],
  );
  const bringIntoView = useCallback(
    (id: string, force = false, opening = false) => {
      const position = rendered.current.get(id);
      const wrapper = host.current;
      const api = viewport.current;
      if (!position || !wrapper || !api) return Promise.resolve();
      const { positionX, positionY, scale: zoom } = api.instance.state;
      const width = wrapper.clientWidth;
      const height = wrapper.clientHeight;
      const left = position.x * zoom + positionX;
      const top = position.y * zoom + positionY;
      const anticipatedWidth = opening ? (compact ? 316 : 576) : position.width;
      const anticipatedHeight = opening
        ? Math.min(440, height - 180)
        : position.height;
      let x = positionX;
      let y = positionY;
      if (force || left < 24 || left + anticipatedWidth * zoom > width - 24)
        x =
          Math.min(80, Math.max(24, (width - anticipatedWidth * zoom) * 0.18)) -
          position.x * zoom;
      if (force || top < 100 || top + anticipatedHeight * zoom > height - 76)
        y =
          Math.max(104, (height - anticipatedHeight * zoom) / 2) -
          position.y * zoom;
      if (Math.abs(x - positionX) < 1 && Math.abs(y - positionY) < 1)
        return Promise.resolve();
      return api.setTransform(x, y, zoom, reduced ? 0 : 360, "easeInOutCubic");
    },
    [compact, reduced],
  );
  const reveal = useCallback(
    async (id: string, heading?: string, ancestors: string[] = []) => {
      cancelOpening();
      const request = transition.current;
      openingNode.current = id;
      setOpening(id);
      setFocused(id);
      await bringIntoView(id, true, true);
      if (request !== transition.current) return;
      const position = rendered.current.get(id);
      const state = viewport.current?.instance.state;
      if (position && state)
        expansionAnchor.current = {
          id,
          x: position.x * state.scale + state.positionX,
          y: position.y * state.scale + state.positionY,
          zoom: state.scale,
        };
      openingNode.current = undefined;
      setOpening(undefined);
      setExpanded((previous) => new Set([...previous, ...ancestors, id]));
      pending.current = { id, heading, keyboard: !heading, positioned: true };
    },
    [bringIntoView, cancelOpening],
  );
  useEffect(() => {
    const todo = pending.current;
    if (!todo || openingNode.current || !tree.nodes.has(todo.id)) return;
    const handle = window.setTimeout(
      () => {
        if (pending.current !== todo) return;
        if (!todo.positioned) void bringIntoView(todo.id);
        const element = window.document.getElementById(
          `node-${encodeURIComponent(todo.id)}`,
        );
        if (todo.keyboard)
          element
            ?.querySelector<HTMLButtonElement>(".node-toggle")
            ?.focus({ preventScroll: true });
        if (todo.heading) {
          const preview = element?.querySelector<HTMLElement>(".preview");
          const heading = [
            ...(preview?.querySelectorAll<HTMLElement>("[id]") ?? []),
          ].find((h) => h.id === todo.heading);
          if (preview && heading) {
            preview.scrollTo({
              top: heading.offsetTop - preview.offsetTop - 12,
              behavior: reduced ? "instant" : "smooth",
            });
            setActiveHeading(todo.heading);
          } else setMessage(`Heading not found: ${todo.heading}`);
        }
        pending.current = null;
      },
      reduced ? 0 : 290,
    );
    return () => window.clearTimeout(handle);
  }, [layout, tree, bringIntoView, reduced, focused, opening]);
  useEffect(() => {
    pending.current = { id: root, heading: initialHeading };
  }, [root, initialHeading]);
  useEffect(() => {
    let active = document?.headings[0]?.id ?? "";
    const preview = window.document
      .getElementById(`node-${encodeURIComponent(focused)}`)
      ?.querySelector<HTMLElement>(".preview");
    if (preview) {
      const top = preview.getBoundingClientRect().top + 36;
      for (const heading of preview.querySelectorAll<HTMLElement>("[id]"))
        if (heading.getBoundingClientRect().top <= top) active = heading.id;
    }
    setActiveHeading(active);
  }, [document, focused]);

  const toggle = useCallback(
    (id: string) => {
      const node = tree.nodes.get(id);
      if (!node) return;
      setFocused(id);
      if (node.reference || node.missing) {
        setMessage(
          node.reference
            ? "This question points back to an ancestor. Its branch stops here."
            : "This link has no readable Markdown target. Check the folder warnings.",
        );
        return;
      }
      if (openingNode.current === id) {
        cancelOpening();
        return;
      }
      if (expanded.has(id)) {
        cancelOpening();
        setExpanded((previous) => {
          const next = new Set(previous);
          next.delete(id);
          return next;
        });
        pending.current = { id, keyboard: true };
      } else void reveal(id);
    },
    [tree, expanded, reveal, cancelOpening],
  );
  const openFile = useCallback(
    (path: string, heading?: string, fromId?: string) => {
      let ids: string[];
      if (mode === "folders")
        ids = [...folderAncestors(path), JSON.stringify([path])];
      else {
        const fromNode = fromId ? tree.nodes.get(fromId) : undefined;
        const direct = fromNode?.children.find(
          (id) =>
            tree.nodes.get(id)?.path === path && !tree.nodes.get(id)?.reference,
        );
        if (direct) ids = [direct];
        else {
          const chain = findPath(pack, entry, path);
          ids = chain
            ? chain.map((_, i) => JSON.stringify(chain.slice(0, i + 1)))
            : [JSON.stringify([path])];
          if (!chain) {
            setDetached({ path, heading });
          } else setDetached(undefined);
        }
      }
      const id = ids.at(-1)!;
      if (tree.nodes.has(id)) void reveal(id, heading, ids);
      else {
        cancelOpening();
        // Reveal ancestors first so the destination exists before moving to it.
        setExpanded((previous) => new Set([...previous, ...ids.slice(0, -1)]));
        destination.current = { id, heading, ancestors: ids };
      }
      setFilesOpen(false);
    },
    [mode, tree, pack, entry, reveal, cancelOpening],
  );
  useEffect(() => {
    const target = destination.current;
    if (!target || !tree.nodes.has(target.id)) return;
    const handle = window.setTimeout(
      () => {
        destination.current = null;
        void reveal(target.id, target.heading, target.ancestors);
      },
      reduced ? 0 : 280,
    );
    return () => window.clearTimeout(handle);
  }, [tree, reveal, reduced]);
  const [detached, setDetached] = useState<{
    path: string;
    heading?: string;
  }>();
  // Unlinked documents use a separate keyed workspace, preserving the main session.
  const navigate = useCallback(
    (id: string, href: string) => {
      const source = tree.nodes.get(id)?.path;
      if (!source) return;
      try {
        const resolved = resolveLink(source, href);
        if (!resolved) {
          setMessage(
            "Only relative Markdown links and heading links open inside the tree.",
          );
          return;
        }
        if (!pack.documents.has(resolved.path)) {
          setMessage(`Missing Markdown file: ${resolved.path}`);
          return;
        }
        if (resolved.path === source) {
          pending.current = { id, heading: resolved.fragment };
          setExpanded((p) => new Set([...p, id]));
          setFocused(id);
          setActiveHeading(resolved.fragment);
        } else openFile(resolved.path, resolved.fragment, id);
      } catch (error) {
        setMessage((error as Error).message);
      }
    },
    [tree, pack, openFile],
  );
  const jump = (heading: string) => {
    pending.current = { id: focused, heading };
    setExpanded((previous) => new Set([...previous, focused]));
    setActiveHeading(heading);
    setOutlineOpen(false);
  };
  const onSection = useCallback(
    (id: string, heading: string) => {
      if (id === focused) setActiveHeading(heading);
    },
    [focused],
  );
  const onKey = (event: KeyboardEvent, id: string) => {
    const node = tree.nodes.get(id)!;
    let target: string | undefined;
    const siblings = node.parent
      ? tree.nodes.get(node.parent)!.children
      : [root];
    const index = siblings.indexOf(id);
    if (event.key === "ArrowLeft") target = node.parent;
    if (event.key === "ArrowRight") {
      if (!expanded.has(id)) {
        toggle(id);
        event.preventDefault();
        return;
      }
      target = node.children[0];
    }
    if (event.key === "ArrowDown") target = siblings[index + 1];
    if (event.key === "ArrowUp") target = siblings[index - 1];
    if (event.key === "Home") target = root;
    if (target) {
      event.preventDefault();
      setFocused(target);
      pending.current = { id: target, keyboard: true };
      bringIntoView(target);
      window.document
        .getElementById(`node-${encodeURIComponent(target)}`)
        ?.querySelector<HTMLButtonElement>(".node-toggle")
        ?.focus({ preventScroll: true });
    }
  };
  if (detached)
    return (
      <div className="detached-workspace">
        <button
          className="detached-back"
          onClick={() => {
            setDetached(undefined);
            setFocused(root);
          }}
        >
          ← Return to main tree
        </button>
        <Workspace
          key={detached.path}
          pack={pack}
          entry={detached.path}
          mode="links"
          onHelp={onHelp}
          initialHeading={detached.heading}
        />
      </div>
    );

  return (
    <div className="workspace-shell">
      <div className="tree-workspace" ref={host}>
        <div className="workspace-caption">
          <span className="folder-caption">
            <Icon name="folder" size={15} />
            {pack.name}
          </span>
          <span className="caption-separator">/</span>
          <h1 className="workspace-title">
            {mode === "links" ? "Question tree" : "Folder-derived tree"}
          </h1>
          <button
            className="outline-mobile"
            onClick={() => setOutlineOpen(true)}
          >
            <Icon name="outline" />
            Outline
          </button>
        </div>
        <div className="tree-hint">Follow a question. See where it leads.</div>
        <TransformWrapper
          ref={viewport}
          minScale={0.25}
          maxScale={1.5}
          initialScale={1}
          initialPositionX={0}
          initialPositionY={40}
          limitToBounds={false}
          centerZoomedOut={false}
          wheel={{ step: 0.08, excluded: ["no-pan", "preview"] }}
          panning={{
            excluded: [
              "no-pan",
              "node-toggle",
              "node-footer",
              "preview",
              "button",
              "a",
            ],
          }}
          doubleClick={{ disabled: true }}
          onPanningStart={cancelOpening}
          onWheelStart={cancelOpening}
          onPinchStart={cancelOpening}
          onTransform={(_, state) => setScale(state.scale)}
        >
          <TransformComponent
            wrapperClass="transform-wrapper"
            contentClass="transform-content"
            wrapperStyle={{ width: "100%", height: "100%" }}
            contentStyle={{ width: layout.width, height: layout.height }}
          >
            <div
              className="tree-plane"
              role="region"
              aria-label="Learning question tree"
              style={{ width: layout.width, height: layout.height }}
            >
              <Branches nodes={tree.nodes} positions={positions} path={path} />
              {[...tree.nodes.values()].map((node) => (
                <FileNode
                  key={node.id}
                  node={node}
                  doc={node.path ? pack.documents.get(node.path) : undefined}
                  open={
                    expanded.has(node.id) && !node.reference && !node.missing
                  }
                  focused={node.id === focused}
                  onPath={path.has(node.id)}
                  opening={opening === node.id}
                  position={
                    positions.get(node.id) ?? layout.positions.get(node.id)!
                  }
                  measure={measure}
                  toggle={toggle}
                  focus={focus}
                  navigate={navigate}
                  onKey={onKey}
                  onSection={onSection}
                  scrolls={scrolls}
                  warningCount={warnings.get(node.path ?? "") ?? 0}
                />
              ))}
            </div>
          </TransformComponent>
        </TransformWrapper>
        {tree.truncated && (
          <p className="tree-limit" role="status">
            Showing 2,000 branch occurrences. Collapse a branch to explore
            another path.
          </p>
        )}
        <div className="canvas-bottom">
          <div className="viewport-controls" aria-label="Tree view controls">
            <button
              className="icon-button"
              title="Return to root"
              aria-label="Return to root"
              onClick={() => {
                cancelOpening();
                setFocused(root);
                void bringIntoView(root, true);
              }}
            >
              <Icon name="root" />
            </button>
            <span className="control-divider" />
            <button
              className="icon-button"
              title="Zoom out"
              aria-label="Zoom out"
              onClick={() => {
                cancelOpening();
                void viewport.current?.zoomOut(0.15, reduced ? 0 : 180);
              }}
            >
              <Icon name="minus" />
            </button>
            <span className="zoom-value">{Math.round(scale * 100)}%</span>
            <button
              className="icon-button"
              title="Zoom in"
              aria-label="Zoom in"
              onClick={() => {
                cancelOpening();
                void viewport.current?.zoomIn(0.15, reduced ? 0 : 180);
              }}
            >
              <Icon name="plus" />
            </button>
            <span className="control-divider" />
            <button
              className="icon-button"
              title="Fit visible branches"
              aria-label="Fit visible branches"
              onClick={() => {
                cancelOpening();
                const width = host.current?.clientWidth ?? 900;
                const height = host.current?.clientHeight ?? 600;
                const zoom = Math.min(
                  1,
                  Math.max(
                    0.25,
                    Math.min(
                      (width - 64) / layout.width,
                      (height - 130) / layout.height,
                    ),
                  ),
                );
                viewport.current?.setTransform(24, 70, zoom, reduced ? 0 : 280);
              }}
            >
              <Icon name="fit" />
            </button>
          </div>
          <button
            className="all-files-button"
            onClick={() => setFilesOpen(true)}
          >
            <Icon name="file" size={15} />
            {mode === "links" && unlinked.length
              ? `Unlinked files (${unlinked.length})`
              : "All files"}
          </button>
          <button
            className="help-canvas icon-button"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts"
            onClick={onHelp}
          >
            <Icon name="help" />
          </button>
        </div>
        <div className="tree-status">
          <span className="status-dot" />
          {pack.documents.size} Markdown{" "}
          {pack.documents.size === 1 ? "file" : "files"}
          <span>·</span>Local session
        </div>
      </div>
      <aside className="outline-rail">
        <Outline
          key={document?.path ?? focused}
          document={document}
          active={activeHeading}
          jump={jump}
        />
      </aside>
      <Modal
        open={outlineOpen}
        onClose={() => setOutlineOpen(false)}
        title="Document outline"
        description="Headings in the focused Markdown file."
      >
        <Outline
          key={document?.path ?? focused}
          document={document}
          active={activeHeading}
          jump={jump}
        />
      </Modal>
      <Modal
        open={filesOpen}
        onClose={() => setFilesOpen(false)}
        title="Markdown files"
        description={
          unlinked.length && mode === "links"
            ? `${unlinked.length} files are outside the main learning path. Open any file to explore it.`
            : "Open any imported Markdown file."
        }
      >
        <div className="file-picker-list">
          {[...pack.documents.values()].map((doc) => (
            <button key={doc.path} onClick={() => openFile(doc.path)}>
              <Icon name="file" />
              <span>
                {doc.title}
                <small>
                  {doc.path}
                  {!reached.has(doc.path) && mode === "links"
                    ? " · unlinked"
                    : ""}
                </small>
              </span>
              <Icon name="chevron" size={14} />
            </button>
          ))}
        </div>
      </Modal>
      {message && (
        <div className="toast" role="status">
          {message}
          <button
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => setMessage("")}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
