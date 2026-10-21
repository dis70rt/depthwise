import { unified } from "unified";
import remarkParse from "remark-parse";
import { toString } from "mdast-util-to-string";
import type { Root } from "mdast";
import {
  buildPack,
  normalizePath,
  parseDocument,
  type Pack,
} from "./documents";

export interface EditorDraft {
  kind: "edit" | "add";
  parent: string;
  path: string;
  text: string;
}
export type Originals = Record<string, string | null>;

export function nextFollowupPath(pack: Pack, parent: string): string {
  const folder = parent.includes("/")
    ? parent.slice(0, parent.lastIndexOf("/") + 1)
    : "";
  let n = 1;
  while (pack.documents.has(`${folder}follow-up${n === 1 ? "" : `-${n}`}.md`))
    n++;
  return `${folder}follow-up${n === 1 ? "" : `-${n}`}.md`;
}
export function markdownPath(input: string): string {
  const path = normalizePath(input.trim());
  if (
    !/\.md$/i.test(path) ||
    path
      .split("/")
      .some(
        (part) =>
          part.startsWith(".") ||
          part === "node_modules" ||
          /[<>:"|?*\x00-\x1f]/.test(part),
      )
  )
    throw new Error(
      "Use a Markdown path such as notes/follow-up.md, without hidden folders or reserved characters.",
    );
  return path;
}
function relativeLink(parent: string, child: string): string {
  const from = parent.split("/").slice(0, -1);
  const to = child.split("/");
  while (from.length && to.length && from[0] === to[0]) {
    from.shift();
    to.shift();
  }
  return [
    ...from.map(() => ".."),
    ...to.map((part) =>
      encodeURIComponent(part).replace(
        /[!'()*]/g,
        (char) => `%${char.charCodeAt(0).toString(16)}`,
      ),
    ),
  ].join("/");
}
export function appendFollowup(
  raw: string,
  parent: string,
  child: string,
  title: string,
): string {
  const newline = raw.includes("\r\n") ? "\r\n" : "\n";
  // AST offsets avoid treating headings inside fenced code as structural sections.
  const ast = unified().use(remarkParse).parse(raw) as Root;
  const section = ast.children.findIndex(
    (node) =>
      node.type === "heading" &&
      node.depth === 2 &&
      toString(node) === "Follow-up questions",
  );
  const label = title.replace(/([\\[\]])/g, "\\$1").replace(/[\r\n]/g, " ");
  const bullet = `- [${label}](${relativeLink(parent, child)})`;
  if (section < 0)
    return `${raw.trimEnd()}${newline}${newline}## Follow-up questions${newline}${newline}${bullet}${newline}`;
  const next = ast.children
    .slice(section + 1)
    .find((node) => node.type === "heading" && node.depth <= 2);
  const offset = next?.position?.start.offset ?? raw.length;
  return `${raw.slice(0, offset).trimEnd()}${newline}${newline}${bullet}${newline}${newline}${raw.slice(offset)}`;
}
export function applyDraft(
  pack: Pack,
  draft: EditorDraft,
  originals: Originals = {},
): { pack: Pack; originals: Originals; path: string } {
  const path = markdownPath(draft.path);
  if (draft.kind === "edit" && path !== draft.parent)
    throw new Error(
      "Renaming files is not supported. Edit the existing Markdown path.",
    );
  if (!pack.documents.has(draft.parent))
    throw new Error("The original file is no longer available.");
  if (
    draft.kind === "add" &&
    [...pack.documents.keys()].some(
      (existing) => existing.toLowerCase() === path.toLowerCase(),
    )
  )
    throw new Error("That file already exists. Choose another path.");
  const changes = new Map<string, string>([[path, draft.text]]);
  if (draft.kind === "add") {
    const doc = parseDocument(path, draft.text, []);
    if (!draft.text.trim())
      throw new Error(
        "Write a question or some Markdown before adding the follow-up.",
      );
    changes.set(
      draft.parent,
      appendFollowup(
        pack.documents.get(draft.parent)!.raw,
        draft.parent,
        path,
        doc.title,
      ),
    );
  }
  const sources = [...pack.documents.values()].map((doc) => ({
    path: doc.path,
    text: changes.get(doc.path) ?? doc.raw,
  }));
  if (draft.kind === "add") sources.push({ path, text: draft.text });
  const next = buildPack(pack.name, sources, pack.ignored);
  const baselines = { ...originals };
  for (const [changed, text] of changes) {
    if (!Object.hasOwn(baselines, changed))
      baselines[changed] = pack.documents.get(changed)?.raw ?? null;
    if (baselines[changed] === text) delete baselines[changed];
  }
  return { pack: next, originals: baselines, path };
}
