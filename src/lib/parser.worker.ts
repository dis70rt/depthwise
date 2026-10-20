import { buildPack, type Source } from "./documents";
self.onmessage = (
  event: MessageEvent<{ name: string; sources: Source[]; ignored: number }>,
) => {
  try {
    self.postMessage({
      pack: buildPack(event.data.name, event.data.sources, event.data.ignored),
    });
  } catch (error) {
    self.postMessage({ error: (error as Error).message });
  }
};
