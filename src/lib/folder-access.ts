import { LIMITS, type Pack } from "./documents";
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
    const file = await (await fileAt(root, path, false)).getFile();
    if (file.size > LIMITS.fileBytes)
      throw new Error(
        `${path} exceeds the comparison limit; it was not read or overwritten.`,
      );
    return await file.text();
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
/** Postorder across the entire dependency graph; cycles cannot have a child-first plan. */
export function folderWritePlan(pack: Pack, paths: string[]): string[] {
  const colors = new Map<string, number>();
  const ordered: string[] = [];
  for (const root of [...pack.documents.keys()].sort()) {
    const stack: { path: string; leave?: boolean }[] = [{ path: root }];
    while (stack.length) {
      const step = stack.pop()!;
      if (step.leave) {
        colors.set(step.path, 2);
        ordered.push(step.path);
        continue;
      }
      if (colors.get(step.path) === 1)
        throw new Error(
          "This folder contains a link cycle. Use ZIP export; a safe child-first folder save is not possible. No files were written.",
        );
      if (colors.get(step.path) === 2) continue;
      colors.set(step.path, 1);
      stack.push({ path: step.path, leave: true });
      for (const child of pack.documents
        .get(step.path)
        ?.children.slice()
        .reverse() ?? []) {
        if (child.target && pack.documents.has(child.target))
          stack.push({ path: child.target });
      }
    }
  }
  const requested = new Set(paths);
  return ordered.filter((path) => requested.has(path));
}
let writing = false;
export async function writeFolder(
  root: DirectoryHandle,
  pack: Pack,
  originals: Originals,
): Promise<string[]> {
  if (writing) throw new Error("A folder save is already in progress.");
  writing = true;
  try {
    return await writeFolderOnce(root, pack, originals);
  } finally {
    writing = false;
  }
}
async function writeFolderOnce(
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
  const paths = folderWritePlan(
    pack,
    empty ? [...pack.documents.keys()] : Object.keys(originals),
  );
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
  let backup: FileSystemDirectoryHandle | undefined;
  let backupName = "";
  try {
    for (const path of paths) {
      writingPath = path;
      const text = pack.documents.get(path)!.raw;
      const current = await readAt(root, path);
      if (current !== (empty ? null : originals[path]) && current !== text)
        throw new Error(
          `${path} changed while saving. It was not overwritten.`,
        );
      if (current !== text) {
        // Capture a recovery version before touching an existing file. These copies
        // deliberately remain on disk; the UI discloses their location and retention.
        if (current !== null) {
          if (!backup) {
            backupName = `.depthwise-backups/${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID()}`;
            const [base, run] = backupName.split("/");
            backup = await (
              await root.getDirectoryHandle(base, { create: true })
            ).getDirectoryHandle(run, { create: true });
          }
          const recovery = await (
            await fileAt(backup as DirectoryHandle, path, true)
          ).createWritable();
          try {
            await recovery.write(current);
            await recovery.close();
          } catch (error) {
            await recovery.abort().catch(() => {});
            throw error;
          }
        }
        const handle = await fileAt(root, path, true);
        const writable = await (
          handle.createWritable as (options?: {
            mode: string;
          }) => Promise<FileSystemWritableFileStream>
        )({ mode: "exclusive" });
        try {
          // Catch edits during writable creation as well as the initial preflight.
          const afterOpen = await readAt(root, path);
          if (afterOpen !== (current ?? ""))
            throw new Error(
              `${path} changed while opening its writer. It was not overwritten.`,
            );
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
      `${saved.length} file(s) saved before writing stopped: ${(error as Error).message}. Remaining changes are still in your browser.${backupName ? ` Recovery files: ${backupName}.` : ""}`,
      saved,
      pending,
    );
  }
}
