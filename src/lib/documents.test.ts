import { describe, expect, it } from "vitest";
import {
  buildPack,
  findPath,
  normalizePath,
  reachable,
  resolveLink,
  LIMITS,
} from "./documents";

const node = (question: string, links = "") =>
  `# ${question}\n\n## Follow-up questions\n${links}`;
describe("Markdown folder contract", () => {
  it("preserves nested relative links and authored child order", () => {
    const pack = buildPack("pack", [
      {
        path: "index.md",
        text: node("Root?", "- [Second?](b/second.md)\n- [First?](first.md)"),
      },
      { path: "first.md", text: node("First?") },
      { path: "b/second.md", text: node("Second?", "- [First?](../first.md)") },
    ]);
    expect(
      pack.documents.get("index.md")!.children.map((c) => c.target),
    ).toEqual(["b/second.md", "first.md"]);
    expect(reachable(pack, "index.md").size).toBe(3);
    expect(findPath(pack, "index.md", "b/second.md")).toEqual([
      "index.md",
      "b/second.md",
    ]);
  });
  it("only extracts direct follow-up bullets, respecting Markdown boundaries", () => {
    const pack = buildPack("pack", [
      {
        path: "index.md",
        text: "# Root?\n\n[ordinary](other.md)\n\n## Follow-up questions\n\n```md\n- [Fake](fake.md)\n```\n\n> - [Quoted](quoted.md)\n\n- [Real?][r]\n  - [Nested](nested.md)\n\n## Other\n- [No](no.md)\n\n[r]: real.md",
      },
      { path: "real.md", text: "# Real?" },
    ]);
    expect(
      pack.documents.get("index.md")!.children.map((c) => c.target),
    ).toEqual(["real.md"]);
  });
  it("blocks escaping, absolute, encoded escaping, and executable links", () => {
    expect(() => resolveLink("index.md", "../outside.md")).toThrow("leaves");
    expect(() => resolveLink("index.md", "%2e%2e/outside.md")).toThrow(
      "leaves",
    );
    expect(() => resolveLink("index.md", "%2foutside.md")).toThrow("leaves");
    expect(resolveLink("index.md", "javascript:alert(1)")).toBeUndefined();
    expect(resolveLink("index.md", "/outside.md")).toBeUndefined();
    expect(() => normalizePath("a\\b.md")).toThrow("Invalid");
  });
  it("decodes Unicode paths and cross-file heading fragments", () => {
    expect(resolveLink("nested/a.md", "../%E6%A0%91.md#why-1")).toEqual({
      path: "树.md",
      fragment: "why-1",
    });
    expect(resolveLink("a.md", "#why")).toEqual({
      path: "a.md",
      fragment: "why",
    });
  });
  it("terminates cycles, deduplicates repeated children, and exposes missing files", () => {
    const pack = buildPack("pack", [
      {
        path: "index.md",
        text: node(
          "Root?",
          "- [A?](a.md)\n- [A?](a.md)\n- [Missing?](missing.md)",
        ),
      },
      { path: "a.md", text: node("A?", "- [Root?](index.md)") },
    ]);
    expect(pack.documents.get("index.md")!.children).toHaveLength(2);
    expect(pack.warnings.some((w) => w.message.includes("Cycle"))).toBe(true);
    expect(pack.warnings.some((w) => w.message.includes("Missing child"))).toBe(
      true,
    );
    expect(reachable(pack, "index.md").size).toBe(2);
  });
  it("handles empty content, heading levels, and duplicate anchors", () => {
    const pack = buildPack("pack", [
      { path: "empty.md", text: "" },
      { path: "index.md", text: "# Question?\n### Why\n## Why\n## Why" },
    ]);
    expect(pack.documents.get("empty.md")!.title).toBe("empty");
    expect(pack.documents.get("index.md")!.headings.map((h) => h.id)).toEqual([
      "question",
      "why",
      "why-1",
      "why-2",
    ]);
  });
  it("rejects ambiguous paths, empty imports, and supported size violations", () => {
    expect(() => buildPack("pack", [])).toThrow("No Markdown");
    expect(() =>
      buildPack("pack", [
        { path: "a.md", text: "" },
        { path: "./a.md", text: "" },
      ]),
    ).toThrow("Duplicate");
    expect(() =>
      buildPack("pack", [
        { path: "a.md", text: "a".repeat(LIMITS.fileBytes + 1) },
      ]),
    ).toThrow("1 MiB");
    expect(() =>
      buildPack(
        "pack",
        Array.from({ length: 1001 }, (_, i) => ({ path: `${i}.md`, text: "" })),
      ),
    ).toThrow("file limit");
  });
  it("sanitizes executable HTML and leaves images inert for the renderer", () => {
    const pack = buildPack("pack", [
      {
        path: "index.md",
        text: "# Safe?\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n![remote](https://remote.invalid/a.png)",
      },
    ]);
    const rendered = JSON.stringify(pack.documents.get("index.md")!.html);
    expect(rendered).not.toContain("script");
    expect(rendered).not.toContain("javascript:");
  });
  it("supports a thousand-file deep tree without recursive traversal overflow", () => {
    const pack = buildPack(
      "large",
      Array.from({ length: 1000 }, (_, i) => ({
        path: i === 0 ? "index.md" : `${i}.md`,
        text: node(
          `Question ${i}?`,
          i < 999 ? `- [Question ${i + 1}?](${i + 1}.md)` : "",
        ),
      })),
    );
    expect(reachable(pack, "index.md").size).toBe(1000);
    expect(findPath(pack, "index.md", "999.md")).toHaveLength(1000);
    expect(pack.warnings).toHaveLength(0);
  });
});

it("does not interpret numbered lists as structural child bullets", () => {
  const pack = buildPack("pack", [
    {
      path: "index.md",
      text: "# Root?\n\n## Follow-up questions\n1. [Numbered?](numbered.md)",
    },
  ]);
  expect(pack.documents.get("index.md")!.children).toEqual([]);
});
