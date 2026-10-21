import { expect, it, vi } from "vitest";
import { buildPack } from "./documents";
import {
  writeFolder,
  FolderSaveError,
  folderWritePlan,
  type DirectoryHandle,
} from "./folder-access";

function folder(initial: Record<string, string>, failPath?: string) {
  const files = new Map(Object.entries(initial));
  const writes: string[] = [];
  const queryPermission = vi.fn(async () => "granted");
  const requestPermission = vi.fn(async () => "granted");
  const handle = (prefix = ""): unknown => ({
    queryPermission,
    requestPermission,
    async *values() {
      for (const name of files.keys()) yield { name, kind: "file" };
    },
    async getDirectoryHandle(name: string, options: { create: boolean }) {
      if (
        !options.create &&
        ![...files.keys()].some((path) => path.startsWith(`${prefix}${name}/`))
      )
        throw new DOMException("Missing directory", "NotFoundError");
      return handle(`${prefix}${name}/`);
    },
    async getFileHandle(name: string, options: { create: boolean }) {
      const path = prefix + name;
      if (!files.has(path) && !options.create)
        throw new DOMException("Missing file", "NotFoundError");
      if (!files.has(path) && options.create) files.set(path, "");
      return {
        async getFile() {
          return {
            size: new TextEncoder().encode(files.get(path)).length,
            async text() {
              return files.get(path);
            },
          };
        },
        async createWritable() {
          let pending = "";
          return {
            async write(text: string) {
              if (path === failPath) throw new Error("Disk is full");
              pending = text;
            },
            async close() {
              files.set(path, pending);
              writes.push(path);
            },
            async abort() {},
          };
        },
      };
    },
  });
  return {
    root: handle() as DirectoryHandle,
    files,
    writes,
    queryPermission,
    requestPermission,
  };
}
it("checks all conflicts before writing and preserves unrelated files", async () => {
  const disk = folder({
    "index.md": "# Old?",
    "child.md": "# External change",
    "notes.txt": "Keep",
  });
  const pack = buildPack("topic", [
    { path: "index.md", text: "# New?" },
    { path: "child.md", text: "# New child?" },
  ]);
  await expect(
    writeFolder(disk.root, pack, {
      "index.md": "# Old?",
      "child.md": "# Old child?",
    }),
  ).rejects.toThrow("No files were written");
  expect(disk.writes).toEqual([]);
  expect(disk.files.get("notes.txt")).toBe("Keep");
});
it("writes new children before their parents and creates nested directories", async () => {
  const disk = folder({ "index.md": "# Old?", "notes.txt": "Keep" });
  const pack = buildPack("topic", [
    {
      path: "index.md",
      text: "# New?\n\n## Follow-up questions\n- [Child?](nested/child.md)",
    },
    { path: "nested/child.md", text: "# Child?" },
  ]);
  await writeFolder(disk.root, pack, {
    "index.md": "# Old?",
    "nested/child.md": null,
  });
  expect(
    disk.writes.filter((path) => !path.startsWith(".depthwise-backups/")),
  ).toEqual(["nested/child.md", "index.md"]);
  const recovery = [...disk.files].find(
    ([path]) =>
      path.startsWith(".depthwise-backups/") && path.endsWith("/index.md"),
  );
  expect(recovery?.[1]).toBe("# Old?");
  expect(disk.files.get("notes.txt")).toBe("Keep");
});
it("handles denied permission without writes", async () => {
  const disk = folder({});
  disk.queryPermission.mockResolvedValue("prompt");
  disk.requestPermission.mockResolvedValue("denied");
  await expect(
    writeFolder(
      disk.root,
      buildPack("topic", [{ path: "index.md", text: "# Main?" }]),
      {},
    ),
  ).rejects.toThrow("permission was not granted");
  expect(disk.writes).toEqual([]);
});
it("reports partial writes with retry baselines, including a new complete copy", async () => {
  const disk = folder({}, "b.md");
  const pack = buildPack("topic", [
    { path: "a.md", text: "# A?" },
    { path: "b.md", text: "# B?" },
  ]);
  try {
    await writeFolder(disk.root, pack, {});
    throw new Error("Expected disk failure");
  } catch (error) {
    expect(error).toBeInstanceOf(FolderSaveError);
    expect((error as FolderSaveError).saved).toEqual(["a.md"]);
    expect((error as FolderSaveError).pending).toEqual({ "b.md": "" });
  }
});
it("does not overwrite existing files at a newly added path", async () => {
  const disk = folder({ "new.md": "External file" });
  await expect(
    writeFolder(
      disk.root,
      buildPack("topic", [{ path: "new.md", text: "# New?" }]),
      { "new.md": null },
    ),
  ).rejects.toThrow("No files were written");
  expect(disk.files.get("new.md")).toBe("External file");
});

it("orders complete copies by actual references, not insertion order", () => {
  const pack = buildPack("topic", [
    {
      path: "root.md",
      text: "# Root?\n\n## Follow-up questions\n- [Child?](child.md)",
    },
    {
      path: "child.md",
      text: "# Child?\n\n## Follow-up questions\n- [Leaf?](leaf.md)",
    },
    { path: "leaf.md", text: "# Leaf?" },
  ]);
  expect(folderWritePlan(pack, [...pack.documents.keys()])).toEqual([
    "leaf.md",
    "child.md",
    "root.md",
  ]);
  expect(folderWritePlan(pack, ["root.md", "leaf.md"])).toEqual([
    "leaf.md",
    "root.md",
  ]);
});
it("rejects cyclic folder copies before writing and keeps ZIP available", async () => {
  const pack = buildPack("topic", [
    { path: "a.md", text: "# A?\n\n## Follow-up questions\n- [A?](a.md)" },
  ]);
  const disk = folder({});
  await expect(writeFolder(disk.root, pack, {})).rejects.toThrow("link cycle");
  expect(disk.writes).toEqual([]);
});
it("bounds externally grown files before reading their text", async () => {
  const disk = folder({ "index.md": "x".repeat(1024 * 1024 + 1) });
  await expect(
    writeFolder(
      disk.root,
      buildPack("topic", [{ path: "index.md", text: "# Changed?" }]),
      { "index.md": "# Original?" },
    ),
  ).rejects.toThrow("comparison limit");
  expect(disk.writes).toEqual([]);
});
it("aborts when the file changes while opening its writable stream", async () => {
  const disk = folder({ "index.md": "# Original?" });
  const get = disk.root.getFileHandle.bind(disk.root);
  disk.root.getFileHandle = async (...args) => {
    const handle = await get(...args);
    const create = handle.createWritable.bind(handle);
    handle.createWritable = async (...options) => {
      const stream = await create(...options);
      disk.files.set("index.md", "# External writer");
      return stream;
    };
    return handle;
  };
  await expect(
    writeFolder(
      disk.root,
      buildPack("topic", [{ path: "index.md", text: "# Changed?" }]),
      { "index.md": "# Original?" },
    ),
  ).rejects.toThrow("changed while opening");
  expect(disk.files.get("index.md")).toBe("# External writer");
});
