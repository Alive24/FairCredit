export type ResourceDraft = {
  content: string;
  updatedAt: number;
};

const DB_NAME = "faircredit-drafts";
const DB_VERSION = 1;
const STORE_NAME = "resourceDrafts";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB is not available in this environment"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexedDB error"));
  });
}

export async function getResourceDraft(
  resourcePubkey: string,
): Promise<ResourceDraft | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(resourcePubkey);

    req.onsuccess = () => {
      resolve((req.result as ResourceDraft | undefined) ?? null);
    };
    req.onerror = () => reject(req.error ?? new Error("indexedDB get error"));
  });
}

export async function setResourceDraft(
  resourcePubkey: string,
  content: string,
): Promise<void> {
  const db = await openDb();
  const value: ResourceDraft = {
    content,
    updatedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, resourcePubkey);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error("indexedDB put error"));
  });
}

export async function deleteResourceDraft(resourcePubkey: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(resourcePubkey);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error("indexedDB delete error"));
  });
}

