import { expect, it } from "vitest";
import { buildPack } from "./documents";
import { layoutTree, makeTree } from "./tree";
const pack = buildPack("test", [
  {
    path: "index.md",
    text: "# Root?\n## Follow-up questions\n- [One?](a.md)\n- [Two?](b.md)",
  },
  { path: "a.md", text: "# One?\n## Follow-up questions\n- [Root?](index.md)" },
  { path: "b.md", text: "# Two?" },
]);
it("reveals immediate children and terminates ancestor references", () => {
  const root = JSON.stringify(["index.md"]);
  const a = JSON.stringify(["index.md", "a.md"]);
  expect(makeTree(pack, "index.md", "links", new Set()).nodes.size).toBe(1);
  const expanded = new Set([root, a]);
  const tree = makeTree(pack, "index.md", "links", expanded);
  expect(tree.nodes.size).toBe(4);
  expect(
    tree.nodes.get(JSON.stringify(["index.md", "a.md", "index.md"]))!.reference,
  ).toBe(true);
});
it("allocates variable-height previews without sibling collisions", () => {
  const root = JSON.stringify(["index.md"]);
  const a = JSON.stringify(["index.md", "a.md"]);
  const b = JSON.stringify(["index.md", "b.md"]);
  const expanded = new Set([root, a, b]);
  const tree = makeTree(pack, "index.md", "links", expanded);
  const layout = layoutTree(
    tree,
    expanded,
    new Map([
      [a, 700],
      [b, 300],
    ]),
    false,
  );
  const one = layout.positions.get(a)!;
  const two = layout.positions.get(b)!;
  expect(one.y + one.height).toBeLessThanOrEqual(two.y - 40);
  expect(one.x).toBeGreaterThan(layout.positions.get(root)!.x);
  expect(tree.nodes.get(root)!.children).toEqual([a, b]);
});
it("builds folder-derived grouping branches without inventing file links", () => {
  const p = buildPack("notes", [
    { path: "a/b.md", text: "# Hello?" },
    { path: "other.md", text: "# Other?" },
  ]);
  const tree = makeTree(
    p,
    "other.md",
    "folders",
    new Set(["@folder", "@folder/a"]),
  );
  expect(tree.nodes.size).toBe(4);
  expect(tree.nodes.get(JSON.stringify(["a/b.md"]))!.parent).toBe("@folder/a");
});
