import { expect, it } from "vitest";
import { buildPack, LIMITS, normalizePath, parseDocument } from "./documents";
import { applyDraft } from "./editing";
import {
  decodeSession,
  encodeSession,
  validDraft,
  validView,
} from "./saved-state";
import type { SavedSession } from "./session";
const fixture = (): SavedSession => ({
  id: "synthetic-session",
  entry: "index.md",
  mode: "links",
  pack: buildPack("Synthetic", [
    { path: "index.md", text: "# A question?\n\nPrivate body." },
  ]),
});
it("stores only intentionally retained raw sources, never duplicate drafts or rendered HTML", () => {
  const session = fixture();
  session.draft = {
    kind: "edit",
    parent: "index.md",
    path: "index.md",
    text: "# Discarded marker",
  };
  session.view = { expanded: [], focused: "root", scrolls: [] };
  const row = encodeSession({ ...session, version: 999 } as SavedSession);
  expect(row).not.toHaveProperty("draft");
  expect(row).not.toHaveProperty("view");
  expect(row).not.toHaveProperty("version");
  expect(row).not.toHaveProperty("pack");
  expect(JSON.stringify(row)).not.toContain("Discarded marker");
  expect(decodeSession(row)?.pack.documents.get("index.md")?.raw).toContain(
    "Private body.",
  );
});
it("rebuilds legacy parsed content from raw Markdown, including missing warning metadata", () => {
  const old = fixture();
  delete (old.pack as any).warnings;
  old.pack.documents.get("index.md")!.html = {
    type: "root",
    children: [
      { type: "element", tagName: "script", properties: {}, children: [] },
    ],
  };
  const restored = decodeSession(old)!;
  expect(restored.pack.warnings).toEqual([]);
  expect(
    JSON.stringify(restored.pack.documents.get("index.md")!.html),
  ).not.toContain("script");
});
it("rejects unknown versions and unusable raw records without pretending they are empty", () => {
  expect(() =>
    decodeSession({ ...encodeSession(fixture()), schemaVersion: 99 }),
  ).toThrow("unsupported format");
  expect(() =>
    decodeSession({ ...encodeSession(fixture()), sources: undefined }),
  ).toThrow("recovery");
  expect(() =>
    decodeSession({ ...encodeSession(fixture()), entry: "missing.md" }),
  ).toThrow("saved entry");
});
it("rejects invalid geometry and malformed drafts", () => {
  const view = { expanded: ["root"], focused: "root", scrolls: [] };
  expect(validView(view)).toBe(true);
  expect(validView({ ...view, viewport: { scale: Infinity } })).toBe(false);
  expect(validView({ ...view, scrolls: [["root", NaN]] })).toBe(false);
  expect(
    validDraft({
      kind: "edit",
      path: "index.md",
      parent: "index.md",
      text: "x".repeat(LIMITS.fileBytes + 1),
    }),
  ).toBe(false);
});
it("bounds multibyte text before authoring/preview parse and bounds normalized path depth", () => {
  const text = "é".repeat(LIMITS.fileBytes / 2 + 1);
  expect(() => parseDocument("draft.md", text, [])).toThrow("1 MiB");
  expect(() =>
    applyDraft(fixture().pack, {
      kind: "add",
      path: "child.md",
      parent: "index.md",
      text,
    }),
  ).toThrow("1 MiB");
  expect(() =>
    normalizePath("nested/".repeat(LIMITS.depth) + "index.md"),
  ).toThrow("Invalid path");
});
