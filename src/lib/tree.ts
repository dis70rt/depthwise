import { type Pack } from "./documents";

export interface TreeNode {
  id: string;
  path?: string;
  title: string;
  children: string[];
  parent?: string;
  depth: number;
  reference?: boolean;
  missing?: boolean;
}
export interface Tree {
  nodes: Map<string, TreeNode>;
  root: string;
  truncated: boolean;
}
export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
  center: number;
}
const snap = (value: number) => Math.ceil(value / 8) * 8;

export function makeTree(
  pack: Pack,
  entry: string,
  mode: "links" | "folders",
  expanded: Set<string>,
): Tree {
  const nodes = new Map<string, TreeNode>();
  const root = mode === "links" ? JSON.stringify([entry]) : "@folder";
  if (mode === "folders") {
    const all = new Map<string, TreeNode>();
    all.set(root, { id: root, title: pack.name, children: [], depth: 0 });
    for (const doc of [...pack.documents.values()].sort((a, b) =>
      a.path.localeCompare(b.path),
    )) {
      const parts = doc.path.split("/");
      let parent = root;
      for (let i = 0; i < parts.length - 1; i++) {
        const id = `@folder/${parts.slice(0, i + 1).join("/")}`;
        if (!all.has(id)) {
          all.set(id, {
            id,
            title: parts[i],
            children: [],
            parent,
            depth: i + 1,
          });
          all.get(parent)!.children.push(id);
        }
        parent = id;
      }
      const id = JSON.stringify([doc.path]);
      all.set(id, {
        id,
        path: doc.path,
        title: doc.title,
        children: [],
        parent,
        depth: parts.length,
      });
      all.get(parent)!.children.push(id);
    }
    const stack = [root];
    while (stack.length) {
      const node = all.get(stack.pop()!)!;
      const children = expanded.has(node.id) ? node.children : [];
      nodes.set(node.id, { ...node, children });
      for (const id of children.slice().reverse()) stack.push(id);
    }
    return { nodes, root, truncated: false };
  }
  const stack = [
    {
      path: entry,
      chain: [entry],
      parent: undefined as string | undefined,
      label: entry,
    },
  ];
  let truncated = false;
  while (stack.length) {
    const { path, chain, parent, label } = stack.pop()!;
    const id = JSON.stringify(chain);
    const doc = pack.documents.get(path);
    const reference = chain.slice(0, -1).includes(path);
    const node: TreeNode = {
      id,
      path,
      title: doc?.title ?? label,
      parent,
      children: [],
      depth: chain.length - 1,
      reference,
      missing: !doc,
    };
    nodes.set(id, node);
    if (parent) nodes.get(parent)!.children.push(id);
    if (!doc || reference || !expanded.has(id)) continue;
    for (let i = doc.children.length - 1; i >= 0; i--) {
      const child = doc.children[i];
      const target = child.target ?? `!invalid:${i}:${child.label}`;
      if (nodes.size + stack.length >= 2000) {
        truncated = true;
        continue;
      }
      stack.push({
        path: target,
        chain: [...chain, target],
        parent: id,
        label: child.label,
      });
    }
  }
  return { nodes, root, truncated };
}

export function layoutTree(
  tree: Tree,
  expanded: Set<string>,
  measured: Map<string, number>,
  compact: boolean,
  editable = false,
) {
  const sizes = new Map<string, { width: number; height: number }>();
  const spans = new Map<string, number>();
  const columns: number[] = [];
  const ordered = [...tree.nodes.values()];
  for (const node of ordered) {
    const open = expanded.has(node.id) && !node.reference && !node.missing;
    const width =
      open && node.path ? (compact ? 316 : 576) : compact ? 288 : 336;
    const height = measured.get(node.id) ?? (open && node.path ? 340 : 80);
    sizes.set(node.id, { width, height });
    columns[node.depth] = Math.max(columns[node.depth] ?? 0, width);
  }
  for (const node of ordered.slice().reverse()) {
    const children = node.children;
    const total =
      children.reduce((sum, id) => sum + (spans.get(id) ?? 0), 0) +
      Math.max(0, children.length - 1) * 40 +
      (editable &&
      expanded.has(node.id) &&
      node.path &&
      !node.missing &&
      !node.reference &&
      children.length
        ? 72
        : 0);
    spans.set(node.id, Math.max(snap(sizes.get(node.id)!.height), total));
  }
  const xs = [48];
  for (let i = 0; i < columns.length; i++) xs[i + 1] = xs[i] + columns[i] + 128;
  const positions = new Map<string, Position>();
  const additions = new Map<string, Position>();
  const stack = [{ id: tree.root, top: 60 }];
  let bottom = 0;
  let right = 0;
  while (stack.length) {
    const { id, top } = stack.pop()!;
    const node = tree.nodes.get(id)!;
    const size = sizes.get(id)!;
    const center = snap(top + spans.get(id)! / 2);
    const y = center - size.height / 2;
    positions.set(id, { x: xs[node.depth], y, ...size, center });
    bottom = Math.max(bottom, y + size.height);
    right = Math.max(right, xs[node.depth] + size.width);
    const canAdd =
      editable &&
      expanded.has(node.id) &&
      Boolean(node.path) &&
      !node.missing &&
      !node.reference;
    const childTotal =
      node.children.reduce((sum, child) => sum + spans.get(child)!, 0) +
      Math.max(0, node.children.length - 1) * 40 +
      (canAdd && node.children.length ? 72 : 0);
    let nextTop = center - childTotal / 2;
    for (const child of node.children) {
      stack.push({ id: child, top: nextTop });
      nextTop += spans.get(child)! + 40;
    }
    if (canAdd) {
      const x = node.children.length
        ? xs[node.depth + 1]
        : xs[node.depth] + size.width + 48;
      const y = node.children.length ? nextTop - 8 : center - 20;
      additions.set(node.id, { x, y, width: 40, height: 40, center: y + 20 });
      right = Math.max(right, x + 40);
      bottom = Math.max(bottom, y + 40);
    }
  }
  return { positions, additions, width: right + 100, height: bottom + 80 };
}

export function folderAncestors(path: string): string[] {
  const parts = path.split("/");
  return [
    "@folder",
    ...parts
      .slice(0, -1)
      .map((_, i) => `@folder/${parts.slice(0, i + 1).join("/")}`),
  ];
}

/** The exact occurrence path; repeated file references stay independent. */
export function activePath(
  nodes: Map<string, TreeNode>,
  focused: string,
): Set<string> {
  const path = new Set<string>();
  let id: string | undefined = focused;
  while (id && nodes.has(id) && !path.has(id)) {
    path.add(id);
    id = nodes.get(id)?.parent;
  }
  return path;
}
