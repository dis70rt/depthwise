import { expect, it } from "vitest";
import { buildPack } from "./documents";
import { activePath, layoutTree, makeTree } from "./tree";
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

it("highlights only the focused occurrence's ancestors, including folder paths", () => {
  const root = JSON.stringify(["index.md"]);
  const a = JSON.stringify(["index.md", "a.md"]);
  const reference = JSON.stringify(["index.md", "a.md", "index.md"]);
  const tree = makeTree(pack, "index.md", "links", new Set([root, a]));
  expect([...activePath(tree.nodes, reference)]).toEqual([reference, a, root]);
  expect(activePath(tree.nodes, JSON.stringify(["index.md", "b.md"]))).toEqual(
    new Set([JSON.stringify(["index.md", "b.md"]), root]),
  );
  expect(activePath(tree.nodes, "unknown").size).toBe(0);
  const folders = makeTree(pack, "index.md", "folders", new Set(["@folder"]));
  expect([...activePath(folders.nodes, JSON.stringify(["a.md"]))]).toEqual([
    JSON.stringify(["a.md"]),
    "@folder",
  ]);
});

it("reserves unobstructed add controls after child groups and beside open leaves", () => {
  const root = JSON.stringify(["index.md"]);
  const a = JSON.stringify(["index.md", "a.md"]);
  const b = JSON.stringify(["index.md", "b.md"]);
  const reference = JSON.stringify(["index.md", "a.md", "index.md"]);
  const expanded = new Set([root, a, b, reference]);
  const tree = makeTree(pack, "index.md", "links", expanded);
  const layout = layoutTree(
    tree,
    expanded,
    new Map([
      [a, 700],
      [b, 300],
    ]),
    false,
    true,
  );
  expect(layout.additions.has(reference)).toBe(false);
  const leaf = layout.positions.get(b)!;
  expect(layout.additions.get(b)!.x).toBeGreaterThan(leaf.x + leaf.width);
  expect(layout.additions.get(b)!.center).toBe(leaf.center);
  expect(layout.additions.get(root)!.y).toBeGreaterThan(leaf.y + leaf.height);
  const afterA = layout.additions.get(a)!;
  expect(afterA.y + afterA.height).toBeLessThan(leaf.y);
  for (const slot of layout.additions.values()) {
    for (const box of layout.positions.values()) {
      const overlap =
        slot.x < box.x + box.width &&
        slot.x + slot.width > box.x &&
        slot.y < box.y + box.height &&
        slot.y + slot.height > box.y;
      expect(overlap).toBe(false);
    }
  }
});
