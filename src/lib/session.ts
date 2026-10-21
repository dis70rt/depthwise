import type { EditorDraft, Originals } from "./editing";
import type { DirectoryHandle } from "./folder-access";
import {
  decodeSession,
  readSessionInput,
  encodeSession,
  validDraft,
  validView,
} from "./saved-state";
import { parseSourcesInWorker, type Pack } from "./documents";
export class SessionRecoveryError extends Error {}

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

let persistent = true;
export function setPersistence(enabled: boolean) {
  persistent = enabled;
}
export function isPersistent() {
  return persistent;
}

// IndexedDB keeps larger folders off the synchronous localStorage/render path.
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("depthwise", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("session");
    let abandoned = false;
    request.onsuccess = () => {
      if (abandoned) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      abandoned = true;
      reject(
        new Error(
          "Session storage is blocked. Close other Depthwise windows and retry.",
        ),
      );
    };
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore, result: (value: T) => void) => void,
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    let tx: IDBTransaction;
    try {
      tx = db.transaction("session", mode);
    } catch (error) {
      db.close();
      reject(error);
      return;
    }
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
      tx.abort();
      db.close();
      reject(error);
    }
  });
}
export function saveSession(session: SavedSession): Promise<void> {
  if (!persistent) return Promise.resolve();
  return transaction("readwrite", (store) => {
    if (!persistent) return;
    store.put(encodeSession(session), "active");
    store.put(session.id, "active-id");
    store.delete("view");
    store.delete("draft");
  });
}
export function saveView(id: string, view: WorkspaceView): Promise<void> {
  if (!persistent) return Promise.resolve();
  if (!validView(view))
    return Promise.reject(new Error("Invalid workspace view."));
  return transaction("readwrite", (store) => {
    const active = store.get("active-id");
    active.onsuccess = () => {
      // A late animation/save from an old tree must never replace a new session.
      if (persistent && active.result === id) store.put({ id, view }, "view");
    };
  });
}
export async function loadSession(): Promise<SavedSession | undefined> {
  const rows = await transaction<any[]>("readonly", (store, result) => {
    const active = store.get("active");
    const view = store.get("view");
    const draft = store.get("draft");
    draft.onsuccess = () => result([active.result, view.result, draft.result]);
  });
  let saved: SavedSession | undefined;
  try {
    const input = readSessionInput(rows[0]);
    if (!input) return;
    const parsed = await parseSourcesInWorker(
      input.name,
      input.sources,
      input.ignored,
    );
    saved = decodeSession(rows[0], parsed);
  } catch (error) {
    throw new SessionRecoveryError((error as Error).message);
  }
  if (!saved) return;
  const recovered = rows[2]?.id === saved.id ? rows[2].draft : undefined;
  if (
    recovered !== undefined &&
    (!validDraft(recovered) ||
      !saved.pack.documents.has(recovered.parent) ||
      (recovered.kind === "edit" && recovered.path !== recovered.parent))
  )
    throw new SessionRecoveryError(
      "The saved draft needs recovery. Download a recovery copy before resetting.",
    );
  // Rebuild parsed content from bounded raw Markdown; invalid geometry falls back to a fresh view.
  const view =
    rows[1]?.id === saved.id && validView(rows[1].view)
      ? rows[1].view
      : undefined;
  // Migrate legacy records and remove duplicate embedded drafts without losing the intentional draft.
  if (rows[0]?.schemaVersion !== 2)
    await transaction("readwrite", (store) => {
      store.put(encodeSession(saved), "active");
      if (recovered) store.put({ id: saved.id, draft: recovered }, "draft");
    });
  return { ...saved, view, draft: recovered };
}
/** Rescue JSON intentionally avoids parsing Markdown or trusting stored HTML. Handles are omitted. */
export function recoverySnapshot(): Promise<unknown[]> {
  return transaction("readonly", (store, result) => {
    const rows = [store.get("active"), store.get("draft"), store.get("view")];
    rows[2].onsuccess = () => result(rows.map((row) => row.result));
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
  if (!persistent) return Promise.resolve();
  return transaction("readwrite", (store) => {
    const active = store.get("active-id");
    active.onsuccess = () => {
      if (persistent && active.result === session.id) {
        store.put(encodeSession(session), "active");
        if (clearDraft) store.delete("draft");
      }
    };
  });
}
export function saveDraft(id: string, draft?: EditorDraft): Promise<void> {
  if (!persistent) return Promise.resolve();
  if (draft && !validDraft(draft))
    return Promise.reject(
      new Error("Draft exceeds the 1 MiB limit or has invalid fields."),
    );
  return transaction("readwrite", (store) => {
    const active = store.get("active-id");
    active.onsuccess = () => {
      if (!persistent || active.result !== id) return;
      if (draft) store.put({ id, draft }, "draft");
      else store.delete("draft");
    };
  });
}
