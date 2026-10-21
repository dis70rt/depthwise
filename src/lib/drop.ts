import { LIMITS } from "./documents";

/** Capture entries synchronously: browsers protect the drag store after drop. */
export async function readDroppedFiles(
  transfer: DataTransfer,
  signal: AbortSignal,
  progress: (message: string) => void,
): Promise<File[]> {
  const entries = Array.from(transfer.items)
    .filter((item) => item.kind === "file")
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemEntry => Boolean(entry));
  const fallback = Array.from(transfer.files);
  const directories = entries.filter((entry) => entry.isDirectory);
  if (directories.length > 1 || (directories.length && entries.length > 1))
    throw new Error("Drop one Markdown folder at a time.");
  if (!entries.length) {
    if (!fallback.length)
      throw new Error(
        "Could not read this drop. Use Open Markdown folder instead.",
      );
    return fallback;
  }

  const files: File[] = [];
  const stack = entries.map((entry) => ({ entry, parent: "" }));
  let markdownCount = 0;
  let markdownBytes = 0;
  while (stack.length) {
    signal.throwIfAborted();
    const { entry, parent } = stack.pop()!;
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const path = parent + entry.name;
    if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      // Chromium returns directory contents in batches; one read is incomplete.
      while (true) {
        signal.throwIfAborted();
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
          reader.readEntries(resolve, reject),
        );
        if (!batch.length) break;
        for (const child of batch)
          stack.push({ entry: child, parent: path + "/" });
      }
    } else if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) =>
        (entry as FileSystemFileEntry).file(resolve, reject),
      );
      signal.throwIfAborted();
      if (/\.md$/i.test(file.name)) {
        markdownCount++;
        markdownBytes += file.size;
        if (markdownCount > LIMITS.files)
          throw new Error("This folder exceeds the 1,000 Markdown file limit.");
        if (file.size > LIMITS.fileBytes)
          throw new Error(`${file.name} exceeds the 1 MiB file limit.`);
        if (markdownBytes > LIMITS.totalBytes)
          throw new Error("This folder exceeds the 20 MiB Markdown limit.");
      }
      // Adapt directory entries to the same path contract as the folder picker.
      if (directories.length)
        Object.defineProperty(file, "webkitRelativePath", { value: path });
      files.push(file);
      progress(`Scanning folder… ${files.length} files found`);
    }
  }
  signal.throwIfAborted();
  if (!files.length) throw new Error("No Markdown files found in this folder.");
  return files;
}
