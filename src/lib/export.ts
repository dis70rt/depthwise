import type { Pack } from "./documents";
export async function exportPack(pack: Pack): Promise<void> {
  const { zip, strToU8 } = await import("fflate");
  const name =
    pack.name
      .replace(/[\\/:*?"<>|\x00-\x1f]/g, "-")
      .replace(/^\.+$/, "topic") || "topic";
  const files: Record<string, Uint8Array> = Object.create(null);
  for (const doc of pack.documents.values())
    files[`${name}/${doc.path}`] = strToU8(doc.raw);
  const bytes = await new Promise<Uint8Array>((resolve, reject) =>
    zip(files, { level: 6 }, (error, data) =>
      error ? reject(error) : resolve(data),
    ),
  );
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(bytes).buffer], { type: "application/zip" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.zip`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
