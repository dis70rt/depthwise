import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { buildPack, reachable, type Source } from "./documents";

function readSources(folder: string): Source[] {
  const files: Source[] = [];
  const stack = [folder];
  while (stack.length) {
    const current = stack.pop()!;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) stack.push(path);
      else if (entry.name.endsWith(".md"))
        files.push({
          path: relative(folder, path),
          text: readFileSync(path, "utf8"),
        });
    }
  }
  return files;
}

describe("portable authoring skill and sample outputs", () => {
  for (const name of ["database-preparation", "ecology-preparation"]) {
    it(`${name} is a complete rooted tree with visible answer content`, () => {
      const sources = readSources(`examples/${name}`);
      const pack = buildPack(name, sources);
      expect(pack.warnings).toEqual([]);
      expect(reachable(pack, "index.md").size).toBe(sources.length);
      const incoming = new Map<string, number>();
      for (const doc of pack.documents.values()) {
        expect(doc.title.endsWith("?")).toBe(true);
        for (const child of doc.children)
          incoming.set(child.target!, (incoming.get(child.target!) ?? 0) + 1);
        const answer = doc.raw.match(/^#[^\n]+\n\n+([^\n]+)/)?.[1];
        expect(answer).toBeTruthy();
        // Answers are regular visible Markdown; structural child links still work.
        expect(JSON.stringify(doc.html)).toContain(answer);
        expect(
          doc.headings.some(
            (heading) => heading.text === "Follow-up questions",
          ),
        ).toBe(false);
      }
      expect(incoming.has("index.md")).toBe(false);
      for (const path of pack.documents.keys())
        if (path !== "index.md") expect(incoming.get(path)).toBe(1);
    });
  }
  it("ships the same skill in the repository and the app download", () => {
    const skill = readFileSync(
      "skills/depthwise-question-tree/SKILL.md",
      "utf8",
    );
    expect(
      readFileSync("public/depthwise-question-tree-SKILL.md", "utf8"),
    ).toBe(skill);
    expect(skill).toMatch(
      /^---\nname: depthwise-question-tree\ndescription: .+\n---/,
    );
    expect(skill).toContain("## Follow-up questions");
    expect(skill).toContain("Cannot write files?");
    expect(skill).toContain("Answers and explanations allowed.");
  });
});
