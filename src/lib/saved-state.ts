import {
  buildPack,
  LIMITS,
  normalizePath,
  type Pack,
  type Source,
} from "./documents";
import type { EditorDraft } from "./editing";
import type { SavedSession, WorkspaceView } from "./session";

export const SESSION_SCHEMA = 2;
const record = (value: unknown): value is Record<string, any> =>
  Boolean(value && typeof value === "object");
const bounded = (value: unknown, max = 4096): value is string =>
  typeof value === "string" && value.length <= max;
export function validDraft(value: unknown): value is EditorDraft {
  return (
    record(value) &&
    ["edit", "add"].includes(value.kind) &&
    bounded(value.parent) &&
    bounded(value.path) &&
    typeof value.text === "string" &&
    value.text.length <= LIMITS.fileBytes &&
    new TextEncoder().encode(value.text).length <= LIMITS.fileBytes
  );
}
export function validView(value: unknown, depth = 0): value is WorkspaceView {
  if (
    !record(value) ||
    depth > LIMITS.depth ||
    !Array.isArray(value.expanded) ||
    value.expanded.length > 2000 ||
    !value.expanded.every((id: unknown) => bounded(id, 131072)) ||
    !bounded(value.focused, 131072) ||
    !Array.isArray(value.scrolls) ||
    value.scrolls.length > 2000 ||
    !value.scrolls.every(
      (pair: unknown) =>
        Array.isArray(pair) &&
        pair.length === 2 &&
        bounded(pair[0], 131072) &&
        Number.isFinite(pair[1]) &&
        pair[1] >= 0,
    )
  )
    return false;
  if (
    value.viewport &&
    (!record(value.viewport) ||
      !["scale", "positionX", "positionY", "width", "height"].every((key) =>
        Number.isFinite(value.viewport[key]),
      ) ||
      value.viewport.scale < 0.25 ||
      value.viewport.scale > 1.5 ||
      value.viewport.width <= 0 ||
      value.viewport.height <= 0 ||
      Math.abs(value.viewport.positionX) > 1e8 ||
      Math.abs(value.viewport.positionY) > 1e8)
  )
    return false;
  return (
    !value.detached ||
    (record(value.detached) &&
      bounded(value.detached.path) &&
      (!value.detached.view || validView(value.detached.view, depth + 1)))
  );
}
/** Persist only raw inputs and intentionally retained fields; never UI/draft/HAST objects. */
export function encodeSession(session: SavedSession) {
  return {
    schemaVersion: SESSION_SCHEMA,
    id: session.id,
    entry: session.entry,
    mode: session.mode,
    name: session.pack.name,
    ignored: session.pack.ignored,
    sources: [...session.pack.documents.values()].map((doc) => ({
      path: doc.path,
      text: doc.raw,
    })),
    originals: session.originals,
    directory: session.directory,
  };
}
export function readSessionInput(raw: unknown) {
  if (raw === undefined) return;
  if (
    !record(raw) ||
    (raw.schemaVersion !== undefined && raw.schemaVersion !== SESSION_SCHEMA)
  )
    throw new Error(
      "This saved session uses an unsupported format. Download a recovery copy before resetting.",
    );
  const sources: Source[] =
    raw.schemaVersion === SESSION_SCHEMA
      ? raw.sources
      : raw.pack?.documents instanceof Map
        ? [...raw.pack.documents].map(([path, doc]) => ({
            path,
            text: doc?.raw,
          }))
        : undefined;
  if (
    !bounded(raw.id, 200) ||
    !bounded(raw.entry) ||
    !["links", "folders"].includes(raw.mode) ||
    !Array.isArray(sources) ||
    sources.length > LIMITS.files ||
    !sources.every(
      (source) =>
        record(source) &&
        bounded(source.path) &&
        typeof source.text === "string",
    )
  )
    throw new Error(
      "The saved workspace needs recovery. Its stored data has not been erased.",
    );
  const name = raw.schemaVersion === SESSION_SCHEMA ? raw.name : raw.pack?.name;
  const ignored =
    raw.schemaVersion === SESSION_SCHEMA ? raw.ignored : raw.pack?.ignored;
  let total = 0;
  for (const source of sources) {
    normalizePath(source.path);
    if (source.text.length > LIMITS.fileBytes)
      throw new Error("Saved Markdown exceeds the 1 MiB limit.");
    const bytes = new TextEncoder().encode(source.text).length;
    total += bytes;
    if (bytes > LIMITS.fileBytes || total > LIMITS.totalBytes)
      throw new Error("Saved Markdown exceeds folder limits.");
  }
  return {
    raw,
    sources,
    name: bounded(name, 200) ? name : "Recovered folder",
    ignored:
      Number.isSafeInteger(ignored) && ignored >= 0 && ignored <= LIMITS.entries
        ? ignored
        : 0,
  };
}
export function decodeSession(
  value: unknown,
  parsed?: Pack,
): SavedSession | undefined {
  const input = readSessionInput(value);
  if (!input) return;
  const { raw, name, sources, ignored } = input;
  const pack = parsed ?? buildPack(name, sources, ignored);
  if (!pack.documents.has(raw.entry))
    throw new Error(
      "The saved entry is missing. Download a recovery copy or reset this browser session.",
    );
  let originals: SavedSession["originals"];
  if (raw.originals !== undefined) {
    if (
      !record(raw.originals) ||
      Object.keys(raw.originals).length > LIMITS.files
    )
      throw new Error(
        "Invalid saved baselines. Download a recovery copy before resetting.",
      );
    originals = Object.create(null);
    let total = 0;
    for (const [path, text] of Object.entries(raw.originals)) {
      if (
        normalizePath(path) !== path ||
        !pack.documents.has(path) ||
        (text !== null && typeof text !== "string")
      )
        throw new Error("Invalid saved baseline.");
      if (typeof text === "string" && text.length > LIMITS.fileBytes)
        throw new Error("Saved baselines exceed storage limits.");
      const bytes = text === null ? 0 : new TextEncoder().encode(text).length;
      total += bytes;
      if (bytes > LIMITS.fileBytes || total > LIMITS.totalBytes)
        throw new Error("Saved baselines exceed storage limits.");
      originals![path] = text as string | null;
    }
  }
  const directory =
    raw.directory &&
    raw.directory.kind === "directory" &&
    typeof raw.directory.getFileHandle === "function"
      ? raw.directory
      : undefined;
  return {
    id: raw.id,
    entry: raw.entry,
    mode: raw.mode,
    pack,
    originals,
    directory,
  };
}
