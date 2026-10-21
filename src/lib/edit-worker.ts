import { LIMITS, assertMarkdownSize, type Pack } from "./documents";
import type { EditorDraft, Originals } from "./editing";
export function applyDraftInWorker(
  pack: Pack,
  draft: EditorDraft,
  originals?: Originals,
): Promise<{ pack: Pack; originals: Originals; path: string }> {
  assertMarkdownSize(draft.text);
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./edit.worker.ts", import.meta.url), {
      type: "module",
    });
    const done = () => {
      clearTimeout(timeout);
      worker.terminate();
    };
    const timeout = setTimeout(() => {
      done();
      reject(
        new Error(
          "Updating timed out. Your draft is kept; split large files into smaller topics.",
        ),
      );
    }, LIMITS.parseMilliseconds);
    worker.onmessage = (event) => {
      done();
      event.data.error
        ? reject(new Error(event.data.error))
        : resolve(event.data.result);
    };
    worker.onerror = () => {
      done();
      reject(new Error("Could not update the tree. Your draft is kept."));
    };
    worker.postMessage({ pack, draft, originals });
  });
}
