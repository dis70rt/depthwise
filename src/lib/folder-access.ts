import type { Pack } from "./documents";
import { markdownPath, type Originals } from "./editing";
export type DirectoryHandle = FileSystemDirectoryHandle & {
  values(): AsyncIterableIterator<FileSystemHandle>;
  queryPermission(options: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission(options: { mode: "readwrite" }): Promise<PermissionState>;
};
export function canWriteFolder(): boolean {
  return (
    typeof (window as unknown as { showDirectoryPicker?: unknown })
      .showDirectoryPicker === "function"
  );
}
export function chooseWritableFolder(): Promise<DirectoryHandle> {
  return (
    window as unknown as {
      showDirectoryPicker(options: {
        mode: "readwrite";
      }): Promise<DirectoryHandle>;
    }
  ).showDirectoryPicker({ mode: "readwrite" });
}
async function fileAt(
  root: DirectoryHandle,
  path: string,
  create: boolean,
): Promise<FileSystemFileHandle> {
  const parts = markdownPath(path).split("/");
  let directory: FileSystemDirectoryHandle = root;
  for (const part of parts.slice(0, -1))
    directory = await directory.getDirectoryHandle(part, { create });
  return directory.getFileHandle(parts.at(-1)!, { create });
}
async function readAt(
  root: DirectoryHandle,
  path: string,
): Promise<string | null> {
  try {
    return await (await (await fileAt(root, path, false)).getFile()).text();
  } catch (error) {
    if ((error as DOMException).name === "NotFoundError") return null;
    throw error;
  }
}
export class FolderSaveError extends Error {
  constructor(
    message: string,
    public saved: string[],
    public pending: Originals,
  ) {
    super(message);
  }
}
export async function writeFolder(
  root: DirectoryHandle,
  pack: Pack,
  originals: Originals,
): Promise<string[]> {
  if (
    (await root.queryPermission({ mode: "readwrite" })) !== "granted" &&
    (await root.requestPermission({ mode: "readwrite" })) !== "granted"
  )
    throw new Error(
      "Folder permission was not granted. Your browser copy is safe; download a ZIP or try again.",
    );
  let empty = true;
  for await (const _ of root.values()) {
    empty = false;
    break;
  }
  const paths = empty ? [...pack.documents.keys()] : Object.keys(originals);
  if (!paths.length) return [];
  // Preflight every changed file before the first write. Missing originals and new-file
  // collisions are conflicts too; never silently overwrite another folder's contents.
  for (const path of paths) {
    const current = await readAt(root, path);
    const expected = empty ? null : originals[path];
    const target = pack.documents.get(path)?.raw;
    if (target === undefined) throw new Error(`Missing document: ${path}`);
    if (current !== expected && current !== target)
      throw new Error(
        `${path} changed outside Depthwise or belongs to a different folder. No files were written. Choose the original folder or an empty folder, or download a ZIP.`,
      );
  }
  const saved: string[] = [];
  let writingPath: string | undefined;
  try {
    // Newly added files are written before modified parents, so links don't precede their targets.
    paths.sort(
      (a, b) => Number(originals[a] !== null) - Number(originals[b] !== null),
    );
    for (const path of paths) {
      writingPath = path;
      const text = pack.documents.get(path)!.raw;
      const current = await readAt(root, path);
      if (current !== (empty ? null : originals[path]) && current !== text)
        throw new Error(
          `${path} changed while saving. It was not overwritten.`,
        );
      if (current !== text) {
        const writable = await (
          await fileAt(root, path, true)
        ).createWritable();
        try {
          await writable.write(text);
          await writable.close();
        } catch (error) {
          await writable.abort().catch(() => {});
          throw error;
        }
      }
      saved.push(path);
    }
    return saved;
  } catch (error) {
    const pending: Originals = Object.fromEntries(
      paths
        .filter((path) => !saved.includes(path))
        .map((path) => [path, empty ? null : originals[path]]),
    );
    // getFileHandle(create:true) can leave a new empty file if opening/writing
    // its stream fails. Remember that empty baseline so retry remains possible.
    if (writingPath && pending[writingPath] === null) {
      const current = await readAt(root, writingPath).catch(() => null);
      if (current === "") pending[writingPath] = "";
    }
    throw new FolderSaveError(
      `${saved.length} file(s) saved before writing stopped: ${(error as Error).message}. Remaining changes are still in your browser.`,
      saved,
      pending,
    );
  }
}
