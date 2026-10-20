import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { toString } from "mdast-util-to-string";
import GithubSlugger from "github-slugger";
import type { Root, Link, LinkReference, Definition, ListItem } from "mdast";
import type { Root as HtmlRoot } from "hast";

export interface Heading {
  depth: number;
  text: string;
  id: string;
}
export interface ChildLink {
  label: string;
  href: string;
  target?: string;
}
export interface Diagnostic {
  file: string;
  message: string;
}
export interface Document {
  path: string;
  title: string;
  raw: string;
  headings: Heading[];
  children: ChildLink[];
  html: HtmlRoot;
}
export interface Pack {
  name: string;
  documents: Map<string, Document>;
  warnings: Diagnostic[];
  ignored: number;
}
export interface Source {
  path: string;
  text: string;
}
export const LIMITS = {
  files: 1000,
  fileBytes: 1024 * 1024,
  totalBytes: 20 * 1024 * 1024,
};

const parser = unified().use(remarkParse).use(remarkGfm);
const compiler = unified()
  .use(remarkRehype)
  .use(rehypeSanitize, {
    ...defaultSchema,
    clobberPrefix: "",
    attributes: {
      ...defaultSchema.attributes,
      "*": [...(defaultSchema.attributes?.["*"] ?? []), "id"],
    },
  });

export function normalizePath(input: string): string {
  if (
    !input ||
    input.startsWith("/") ||
    input.includes("\\") ||
    /[\u0000-\u001f]/u.test(input)
  )
    throw new Error(`Invalid path: ${input}`);
  const parts: string[] = [];
  for (const part of input.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!parts.length)
        throw new Error(`Path leaves selected folder: ${input}`);
      parts.pop();
    } else parts.push(part);
  }
  if (!parts.length) throw new Error(`Invalid path: ${input}`);
  return parts.join("/");
}

export function resolveLink(
  source: string,
  href: string,
): { path: string; fragment: string } | undefined {
  if (
    /^[a-z][a-z\d+.-]*:/i.test(href) ||
    href.startsWith("//") ||
    href.startsWith("/")
  )
    return;
  const hash = href.indexOf("#");
  const rawPath = hash < 0 ? href : href.slice(0, hash);
  const fragment = hash < 0 ? "" : decodeURIComponent(href.slice(hash + 1));
  if (rawPath.includes("?"))
    throw new Error(`Query strings are not supported in local links: ${href}`);
  if (!rawPath) return { path: source, fragment };
  const decoded = decodeURIComponent(rawPath);
  if (!/\.md$/i.test(decoded)) return;
  if (decoded.startsWith("/"))
    throw new Error(`Path leaves selected folder: ${href}`);
  return {
    path: normalizePath(
      `${source.includes("/") ? source.slice(0, source.lastIndexOf("/") + 1) : ""}${decoded}`,
    ),
    fragment,
  };
}

function walk(root: unknown, visit: (node: Record<string, unknown>) => void) {
  const stack = [root];
  while (stack.length) {
    const node = stack.pop() as Record<string, unknown>;
    visit(node);
    if (Array.isArray(node.children))
      for (let i = node.children.length - 1; i >= 0; i--)
        stack.push(node.children[i]);
  }
}

export function parseDocument(
  path: string,
  raw: string,
  warnings: Diagnostic[],
): Document {
  const ast = parser.parse(raw.replace(/^\uFEFF/, "")) as Root;
  const slugger = new GithubSlugger();
  const headings: Heading[] = [];
  const definitions = new Map<string, Definition>();
  walk(ast, (node) => {
    if (node.type === "definition")
      definitions.set(
        String(node.identifier).toLowerCase(),
        node as unknown as Definition,
      );
  });
  walk(ast, (node) => {
    if (node.type !== "heading") return;
    const text = toString(node as never);
    const id = slugger.slug(text);
    headings.push({ depth: Number(node.depth), text, id });
    node.data = { hProperties: { id } };
  });
  const h1 = headings.filter((h) => h.depth === 1);
  if (h1.length !== 1)
    warnings.push({
      file: path,
      message: h1.length
        ? "Multiple H1 headings; the first supplies the question."
        : "No H1 question; using the filename.",
    });
  if (!raw.trim())
    warnings.push({ file: path, message: "This file is empty." });
  const children: ChildLink[] = [];
  let inFollowups = false;
  let sections = 0;
  for (const node of ast.children) {
    if (node.type === "heading" && node.depth <= 2) {
      inFollowups =
        node.depth === 2 && toString(node) === "Follow-up questions";
      if (inFollowups) sections++;
    }
    if (!inFollowups || node.type !== "list" || node.ordered) continue;
    for (const item of node.children as ListItem[]) {
      const paragraph = item.children[0];
      if (paragraph?.type !== "paragraph") continue;
      const links = paragraph.children.filter(
        (n) => n.type === "link" || n.type === "linkReference",
      ) as (Link | LinkReference)[];
      if (links.length !== 1) {
        warnings.push({
          file: path,
          message: "Each follow-up bullet needs one Markdown link.",
        });
        continue;
      }
      const link = links[0];
      const href =
        link.type === "link"
          ? link.url
          : definitions.get(link.identifier.toLowerCase())?.url;
      if (!href) {
        warnings.push({
          file: path,
          message: "Unresolved follow-up link reference.",
        });
        continue;
      }
      children.push({ label: toString(link), href });
    }
  }
  if (sections > 1)
    warnings.push({
      file: path,
      message: "Multiple Follow-up questions sections.",
    });
  return {
    path,
    title: h1[0]?.text || path.split("/").pop()!.replace(/\.md$/i, ""),
    raw,
    headings,
    children,
    html: compiler.runSync(ast) as HtmlRoot,
  };
}

export function buildPack(name: string, sources: Source[], ignored = 0): Pack {
  if (!sources.length)
    throw new Error(
      "No Markdown files found. Select a folder containing .md files.",
    );
  if (sources.length > LIMITS.files)
    throw new Error(
      `This folder exceeds the ${LIMITS.files.toLocaleString()} Markdown file limit.`,
    );
  const warnings: Diagnostic[] = [];
  const documents = new Map<string, Document>();
  let total = 0;
  const encoder = new TextEncoder();
  for (const source of sources) {
    const path = normalizePath(source.path);
    const bytes = encoder.encode(source.text).byteLength;
    if (bytes > LIMITS.fileBytes)
      throw new Error(`${path} exceeds the 1 MiB file limit.`);
    total += bytes;
    if (total > LIMITS.totalBytes)
      throw new Error("This folder exceeds the 20 MiB Markdown limit.");
    if (documents.has(path))
      throw new Error(`Duplicate normalized path: ${path}`);
    documents.set(path, parseDocument(path, source.text, warnings));
  }
  for (const doc of documents.values()) {
    const seen = new Set<string>();
    doc.children = doc.children.filter((child) => {
      try {
        const result = resolveLink(doc.path, child.href);
        if (!result || result.fragment) {
          warnings.push({
            file: doc.path,
            message: `Invalid structural child: ${child.href}. Use a relative .md path without a fragment.`,
          });
          return true;
        }
        child.target = result.path;
        if (seen.has(result.path)) {
          warnings.push({
            file: doc.path,
            message: `Repeated child shown once: ${result.path}`,
          });
          return false;
        }
        seen.add(result.path);
        const target = documents.get(result.path);
        if (!target)
          warnings.push({
            file: doc.path,
            message: `Missing child: ${result.path}`,
          });
        else if (child.label !== target.title)
          warnings.push({
            file: doc.path,
            message: `Link label differs from question in ${result.path}.`,
          });
      } catch (error) {
        warnings.push({ file: doc.path, message: (error as Error).message });
      }
      return true;
    });
    walk(doc.html, (node) => {
      if (node.tagName !== "a") return;
      const href = (node.properties as Record<string, unknown>)?.href;
      if (typeof href !== "string") return;
      try {
        const link = resolveLink(doc.path, href);
        if (link && !documents.has(link.path))
          warnings.push({
            file: doc.path,
            message: `Missing link target: ${link.path}`,
          });
      } catch (error) {
        warnings.push({ file: doc.path, message: (error as Error).message });
      }
    });
  }
  // Iterative DFS covers disconnected components too; it never expands repeated paths exponentially.
  const colors = new Map<string, number>();
  const parents = new Map<string, Set<string>>();
  for (const doc of documents.values())
    for (const child of doc.children)
      if (child.target && documents.has(child.target)) {
        const set = parents.get(child.target) ?? new Set();
        set.add(doc.path);
        parents.set(child.target, set);
      }
  for (const [path, incoming] of parents)
    if (incoming.size > 1)
      warnings.push({
        file: path,
        message:
          "Multiple structural parents; each branch shares this document.",
      });
  for (const path of documents.keys()) {
    if (colors.has(path)) continue;
    const stack: { path: string; leave?: boolean }[] = [{ path }];
    while (stack.length) {
      const step = stack.pop()!;
      if (step.leave) {
        colors.set(step.path, 2);
        continue;
      }
      if (colors.get(step.path) === 1) {
        warnings.push({
          file: step.path,
          message: "Cycle detected; traversal stops at ancestor references.",
        });
        continue;
      }
      if (colors.get(step.path) === 2) continue;
      colors.set(step.path, 1);
      stack.push({ path: step.path, leave: true });
      for (const child of documents.get(step.path)!.children.slice().reverse())
        if (child.target && documents.has(child.target))
          stack.push({ path: child.target });
    }
  }
  const unique = [
    ...new Map(warnings.map((w) => [`${w.file}:${w.message}`, w])).values(),
  ];
  return { name, documents, warnings: unique, ignored };
}

export function reachable(pack: Pack, root: string): Set<string> {
  const visited = new Set<string>();
  const stack = [root];
  while (stack.length) {
    const path = stack.pop()!;
    if (visited.has(path) || !pack.documents.has(path)) continue;
    visited.add(path);
    for (const child of pack.documents.get(path)!.children)
      if (child.target) stack.push(child.target);
  }
  return visited;
}

export function findPath(
  pack: Pack,
  root: string,
  target: string,
): string[] | undefined {
  const queue = [root];
  const previous = new Map<string, string | null>([[root, null]]);
  for (let i = 0; i < queue.length; i++) {
    const path = queue[i];
    if (path === target) {
      const result: string[] = [];
      let cursor: string | null = path;
      while (cursor !== null) {
        result.push(cursor);
        cursor = previous.get(cursor)!;
      }
      return result.reverse();
    }
    for (const child of pack.documents.get(path)?.children ?? [])
      if (
        child.target &&
        pack.documents.has(child.target) &&
        !previous.has(child.target)
      ) {
        previous.set(child.target, path);
        queue.push(child.target);
      }
  }
}

export async function importFiles(
  files: File[],
  signal: AbortSignal,
  progress: (value: string) => void,
): Promise<Pack> {
  const folderName =
    files[0]?.webkitRelativePath.split("/")[0] || "Markdown folder";
  const nested = files.some((f) => Boolean(f.webkitRelativePath));
  const accepted = files.filter((file) => {
    const parts = (file.webkitRelativePath || file.name).split("/");
    return (
      /\.md$/i.test(file.name) &&
      !parts.some((p) => p.startsWith(".") || p === "node_modules")
    );
  });
  if (accepted.length > LIMITS.files)
    throw new Error(
      `This folder exceeds the ${LIMITS.files.toLocaleString()} Markdown file limit.`,
    );
  if (accepted.some((f) => f.size > LIMITS.fileBytes))
    throw new Error(
      `${accepted.find((f) => f.size > LIMITS.fileBytes)!.name} exceeds the 1 MiB file limit.`,
    );
  if (accepted.reduce((sum, f) => sum + f.size, 0) > LIMITS.totalBytes)
    throw new Error("This folder exceeds the 20 MiB Markdown limit.");
  const sources: Source[] = [];
  for (let i = 0; i < accepted.length; i += 16) {
    signal.throwIfAborted();
    const batch = accepted.slice(i, i + 16);
    progress(
      `Reading ${Math.min(i + 16, accepted.length)} of ${accepted.length}: ${batch[0].name}`,
    );
    const loaded = await Promise.all(
      batch.map(async (file) => {
        let text: string;
        try {
          text = new TextDecoder("utf-8", { fatal: true }).decode(
            await file.arrayBuffer(),
          );
        } catch {
          throw new Error(
            `Could not read UTF-8 Markdown: ${file.name}. Save it as UTF-8 and retry.`,
          );
        }
        return {
          path: nested
            ? file.webkitRelativePath.split("/").slice(1).join("/")
            : file.name,
          text,
        };
      }),
    );
    signal.throwIfAborted();
    sources.push(...loaded);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  signal.throwIfAborted();
  progress("Checking questions and links…");
  // Yield so cancellation can run before the single parse pass.
  await new Promise((resolve) => setTimeout(resolve, 0));
  signal.throwIfAborted();
  return new Promise<Pack>((resolve, reject) => {
    const worker = new Worker(new URL("./parser.worker.ts", import.meta.url), {
      type: "module",
    });
    const cleanup = () => {
      worker.terminate();
      signal.removeEventListener("abort", cancel);
    };
    const cancel = () => {
      cleanup();
      reject(new DOMException("Import canceled", "AbortError"));
    };
    signal.addEventListener("abort", cancel, { once: true });
    worker.onmessage = (event) => {
      cleanup();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.pack);
    };
    worker.onerror = () => {
      cleanup();
      reject(new Error("Could not parse this folder. Please retry."));
    };
    worker.postMessage({
      name: folderName,
      sources,
      ignored: files.length - accepted.length,
    });
    if (signal.aborted) cancel();
  });
}
