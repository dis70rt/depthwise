import { describe, expect, it } from "vitest";
import { buildPack } from "./documents";
import {
  appendFollowup,
  applyDraft,
  markdownPath,
  nextFollowupPath,
} from "./editing";

const pack = () =>
  buildPack("topic", [
    { path: "index.md", text: "# Main?\n\nOriginal answer.\n" },
  ]);
describe("Markdown editing", () => {
  it("updates content, keeps the original disk baseline, and clears dirty state when reverted", () => {
    const start = pack();
    const changed = applyDraft(start, {
      kind: "edit",
      parent: "index.md",
      path: "index.md",
      text: "# Main?\n\nNew answer with **bold**.",
    });
    expect(changed.pack.documents.get("index.md")!.raw).toContain("**bold**");
    expect(changed.originals["index.md"]).toBe(
      start.documents.get("index.md")!.raw,
    );
    const again = applyDraft(
      changed.pack,
      {
        kind: "edit",
        parent: "index.md",
        path: "index.md",
        text: "# Different title?",
      },
      changed.originals,
    );
    expect(again.originals).toEqual(changed.originals);
    const reverted = applyDraft(
      again.pack,
      {
        kind: "edit",
        parent: "index.md",
        path: "index.md",
        text: start.documents.get("index.md")!.raw,
      },
      again.originals,
    );
    expect(reverted.originals).toEqual({});
  });
  it("creates a child and parent link atomically, escaping labels and relative paths", () => {
    const start = buildPack("topic", [
      {
        path: "index.md",
        text: "# Root?\n\n## Follow-up questions\n- [Main?](notes/main.md)",
      },
      { path: "notes/main.md", text: "# Main?\n\nKeep this explanation." },
    ]);
    const changed = applyDraft(start, {
      kind: "add",
      parent: "notes/main.md",
      path: "other/deep question (1).md",
      text: "# Why [this]?\n\nAn answer.",
    });
    expect(
      changed.pack.documents.get("notes/main.md")!.children[0].target,
    ).toBe("other/deep question (1).md");
    expect(changed.pack.documents.get("notes/main.md")!.children[0].label).toBe(
      "Why [this]?",
    );
    expect(changed.pack.documents.get("notes/main.md")!.raw).toContain(
      "Keep this explanation.",
    );
    expect(changed.originals["other/deep question (1).md"]).toBeNull();
    expect(start.documents.size).toBe(2);
  });
  it("inserts into the structural section before the next heading, ignoring fenced examples", () => {
    const raw =
      "# Main?\r\n\r\n```md\r\n## Follow-up questions\r\n```\r\n\r\n## Follow-up questions\r\n- [Existing](old.md)\r\n\r\n## Notes\r\nLeave this intact.\r\n";
    const result = appendFollowup(raw, "index.md", "new.md", "New?");
    expect(result.indexOf("[New?]")).toBeLessThan(result.indexOf("## Notes"));
    expect(result).toContain("- [Existing](old.md)");
    expect(result).toContain("## Notes\r\nLeave this intact.");
    expect(
      buildPack("topic", [{ path: "index.md", text: result }]).documents.get(
        "index.md",
      )!.children,
    ).toHaveLength(2);
  });
  it("rejects path escapes, duplicate filenames, renames and oversized edits without mutating the tree", () => {
    for (const path of [
      "../escape.md",
      "/absolute.md",
      "hidden/.secret.md",
      "image.png",
      "bad?.md",
    ])
      expect(() => markdownPath(path)).toThrow();
    const start = pack();
    expect(() =>
      applyDraft(start, {
        kind: "add",
        parent: "index.md",
        path: "INDEX.md",
        text: "# Duplicate",
      }),
    ).toThrow("already exists");
    expect(() =>
      applyDraft(start, {
        kind: "edit",
        parent: "index.md",
        path: "renamed.md",
        text: "# Rename",
      }),
    ).toThrow("Renaming");
    expect(() =>
      applyDraft(start, {
        kind: "edit",
        parent: "index.md",
        path: "index.md",
        text: "a".repeat(1024 * 1024 + 1),
      }),
    ).toThrow("1 MiB");
    expect(start.documents.get("index.md")!.raw).toContain("Original answer");
  });
  it("suggests available filenames in the parent folder", () => {
    const start = buildPack("topic", [
      { path: "notes/main.md", text: "# Main?" },
      { path: "notes/follow-up.md", text: "# Existing?" },
    ]);
    expect(nextFollowupPath(start, "notes/main.md")).toBe(
      "notes/follow-up-2.md",
    );
  });
});
