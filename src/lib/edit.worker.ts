import { applyDraft, type EditorDraft, type Originals } from "./editing";
import type { Pack } from "./documents";
self.onmessage = (
  event: MessageEvent<{
    pack: Pack;
    draft: EditorDraft;
    originals?: Originals;
  }>,
) => {
  try {
    self.postMessage({
      result: applyDraft(
        event.data.pack,
        event.data.draft,
        event.data.originals,
      ),
    });
  } catch (error) {
    self.postMessage({ error: (error as Error).message });
  }
};
