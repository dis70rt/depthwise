import type { EditorDraft, Originals } from "./editing";
import type { DirectoryHandle } from "./folder-access";
import type { Pack } from "./documents";

export interface WorkspaceView {
  detached?: { path: string; view?: WorkspaceView };
  expanded: string[];
  focused: string;
  scrolls: [string, number][];
  viewport?: {
    scale: number;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
  };
}
export interface SavedSession {
  originals?: Originals;
  directory?: DirectoryHandle;
  draft?: EditorDraft;
  id: string;
  pack: Pack;
  entry: string;
  mode: "links" | "folders";
  view?: WorkspaceView;
}

// IndexedDB keeps larger folders off the synchronous localStorage/render path.
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("depthwise", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("session");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Session storage is blocked."));
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore, result: (value: T) => void) => void,
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction("session", mode);
    let value: T;
    tx.oncomplete = () => {
      db.close();
      resolve(value);
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error("Session storage failed."));
    };
    try {
      run(tx.objectStore("session"), (next) => {
        value = next;
      });
    } catch (error) {
      db.close();
      reject(error);
    }
  });
}
export function saveSession(session: SavedSession): Promise<void> {
  return transaction("readwrite", (store) => {
    store.put(session, "active");
    store.put(session.id, "active-id");
    store.delete("view");
    store.delete("draft");
  });
}
export function saveView(id: string, view: WorkspaceView): Promise<void> {
  return transaction("readwrite", (store) => {
    const active = store.get("active-id");
    active.onsuccess = () => {
      // A late animation/save from an old tree must never replace a new session.
      if (active.result === id) store.put({ id, view }, "view");
    };
  });
}
export function loadSession(): Promise<SavedSession | undefined> {
  return transaction("readonly", (store, result) => {
    const active = store.get("active");
    const view = store.get("view");
    const draft = store.get("draft");
    draft.onsuccess = () => {
      const saved = active.result as SavedSession | undefined;
      if (
        !saved ||
        !(saved.pack?.documents instanceof Map) ||
        !saved.pack.documents.has(saved.entry) ||
        !["links", "folders"].includes(saved.mode)
      ) {
        result(undefined);
        return;
      }
      result({
        ...saved,
        draft: draft.result?.id === saved.id ? draft.result.draft : undefined,
        view: view.result?.id === saved.id ? view.result.view : undefined,
      });
    };
  });
}
export function clearSession(): Promise<void> {
  return transaction("readwrite", (store) => {
    store.clear();
  });
}

export function updateSession(
  session: SavedSession,
  clearDraft = false,
): Promise<void> {
  return transaction("readwrite", (store) => {
    const active = store.get("active-id");
    active.onsuccess = () => {
      if (active.result === session.id) {
        store.put(session, "active");
        if (clearDraft) store.delete("draft");
      }
    };
  });
}
export function saveDraft(id: string, draft?: EditorDraft): Promise<void> {
  return transaction("readwrite", (store) => {
    const active = store.get("active-id");
    active.onsuccess = () => {
      if (active.result !== id) return;
      if (draft) store.put({ id, draft }, "draft");
      else store.delete("draft");
    };
  });
}
