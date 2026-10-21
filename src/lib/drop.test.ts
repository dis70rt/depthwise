import { describe, expect, it } from "vitest";
import { readDroppedFiles } from "./drop";

const fileEntry = (name: string, text = "# Question?"): FileSystemEntry =>
  ({
    name,
    isDirectory: false,
    isFile: true,
    file: (resolve: (file: File) => void) => resolve(new File([text], name)),
  }) as unknown as FileSystemEntry;

const directory = (
  name: string,
  batches: FileSystemEntry[][],
): FileSystemEntry =>
  ({
    name,
    isDirectory: true,
    isFile: false,
    createReader: () => {
      let index = 0;
      return {
        readEntries: (resolve: (entries: FileSystemEntry[]) => void) =>
          resolve(batches[index++] ?? []),
      };
    },
  }) as unknown as FileSystemEntry;

const transfer = (...entries: FileSystemEntry[]) =>
  ({
    items: entries.map((entry) => ({
      kind: "file",
      webkitGetAsEntry: () => entry,
    })),
    files: [],
  }) as unknown as DataTransfer;

const read = (drop: DataTransfer, signal = new AbortController().signal) =>
  readDroppedFiles(drop, signal, () => {});

describe("dropped Markdown folders", () => {
  it("reads every directory batch and preserves paths through nested folders", async () => {
    const files = await read(
      transfer(
        directory("learning", [
          [
            fileEntry("index.md"),
            directory("nested", [[fileEntry("child.md")]]),
          ],
          [fileEntry("later.md")],
        ]),
      ),
    );
    expect(files.map((file) => file.webkitRelativePath).sort()).toEqual([
      "learning/index.md",
      "learning/later.md",
      "learning/nested/child.md",
    ]);
    expect(await files.find((file) => file.name === "child.md")!.text()).toBe(
      "# Question?",
    );
  });
  it("skips hidden directories and dependencies without traversing them", async () => {
    const files = await read(
      transfer(
        directory("learning", [
          [
            directory(".git", [[fileEntry("private.md")]]),
            directory("node_modules", [[fileEntry("dependency.md")]]),
            fileEntry("index.md"),
          ],
        ]),
      ),
    );
    expect(files.map((file) => file.name)).toEqual(["index.md"]);
  });
  it("rejects multiple roots instead of flattening unrelated learning packs", async () => {
    await expect(
      read(transfer(directory("one", []), directory("two", []))),
    ).rejects.toThrow("one Markdown folder");
    await expect(
      read(transfer(directory("one", []), fileEntry("other.md"))),
    ).rejects.toThrow("one Markdown folder");
  });
  it("handles empty folders, unreadable entries, and canceled scans", async () => {
    await expect(read(transfer(directory("empty", [])))).rejects.toThrow(
      "No Markdown",
    );
    const blocked = {
      name: "blocked.md",
      isFile: true,
      file: (_: unknown, reject: (error: Error) => void) =>
        reject(new Error("Permission denied")),
    } as unknown as FileSystemEntry;
    await expect(read(transfer(blocked))).rejects.toThrow("Permission denied");
    const controller = new AbortController();
    controller.abort();
    await expect(
      read(
        transfer(directory("learning", [[fileEntry("index.md")]])),
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
  it("enforces Markdown size limits during scanning", async () => {
    await expect(
      read(
        transfer(
          directory("learning", [
            [fileEntry("big.md", "x".repeat(1024 * 1024 + 1))],
          ]),
        ),
      ),
    ).rejects.toThrow("1 MiB");
  });
  it("supports dropped files when directory entries are unavailable", async () => {
    const file = new File(["# Question?"], "index.md");
    expect(
      await read({ items: [], files: [file] } as unknown as DataTransfer),
    ).toEqual([file]);
    await expect(
      read({ items: [], files: [] } as unknown as DataTransfer),
    ).rejects.toThrow("Open Markdown folder");
  });
});

it("bounds unsupported directory entries rather than counting only Markdown", async () => {
  const entries = Array.from({ length: 10001 }, (_, index) =>
    fileEntry(`ignored-${index}.txt`),
  );
  await expect(
    read(transfer(directory("learning", [entries]))),
  ).rejects.toThrow("10,000 entry");
});
