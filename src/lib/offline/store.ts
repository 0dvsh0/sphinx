import type { SavedHunt } from "@/lib/riddle";

/**
 * IndexedDB store for built hunts.
 *
 * Why IndexedDB and not localStorage: a hunt is a few kilobytes of text plus coordinates, and
 * localStorage is synchronous, string-only, and capped around 5MB. More importantly a hunt must
 * still be there after the phone has been in a pocket with no signal for an hour, and a synchronous
 * API on the main thread is the wrong thing to touch while a child is waiting.
 *
 * Hand-rolled rather than a library. This is roughly 80 lines and has no supply chain, which matters
 * more than usual in a project whose headline privacy claim is "nothing leaves the device".
 */

const DB_NAME = "sphinx";
const DB_VERSION = 1;
const STORE = "hunts";

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Opens the database, self-healing if the object store is missing.
 *
 * The self-heal is not paranoia. During increment 3 a test probe called
 * `indexedDB.open("sphinx", 1)` before the app had opened it, which created an empty version-1
 * database. `onupgradeneeded` never fires again at the same version, so the app was permanently
 * unable to save anything with no way to recover - a child's saved walks, silently unusable.
 *
 * A real user will not do that. But "the app is permanently broken and there is nothing a child or
 * a parent can do about it" is an unacceptable failure mode for an app whose whole premise is that
 * saved hunts survive, so the store is verified after every open and a mismatch is repaired once.
 */
function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        // Saved hunts are listed most-recent-first in the parent panel.
        store.createIndex("generatedAt", "generatedAt");
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      // Another tab wants to upgrade the schema. Release our handle immediately, or its
      // deleteDatabase or versionchange hangs forever and the other tab is stuck.
      // Found during increment 4 testing: a stale tab held the connection and silently blocked a
      // delete from anywhere else, which is exactly the "child's saved walks are unusable and
      // nothing can fix it" failure this file exists to prevent.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };

      if (db.objectStoreNames.contains(STORE)) {
        resolve(db);
        return;
      }

      // Version 1 exists but without our store - a half-created database. Rebuild it.
      db.close();
      dbPromise = null;
      const purge = indexedDB.deleteDatabase(DB_NAME);
      purge.onsuccess = () => openDb().then(resolve, reject);
      purge.onerror = () => reject(new Error("Sphinx storage is in a bad state and could not be repaired."));
      purge.onblocked = () =>
        reject(new Error("Sphinx storage is in a bad state. Close other Sphinx tabs and retry."));
    };

    request.onerror = () => reject(request.error ?? new Error("Could not open IndexedDB."));
    request.onblocked = () =>
      reject(new Error("IndexedDB upgrade blocked - another Sphinx tab is open. Close it and retry."));
  });

  // If opening fails, do not cache the rejected promise: a later retry should be able to succeed.
  dbPromise.catch(() => {
    dbPromise = null;
  });

  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
        transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
      }),
  );
}

/** Save or overwrite a hunt. */
export function saveHunt(hunt: SavedHunt): Promise<IDBValidKey> {
  return tx("readwrite", (store) => store.put(hunt));
}

export function getHunt(id: string): Promise<SavedHunt | undefined> {
  return tx<SavedHunt | undefined>("readonly", (store) => store.get(id) as IDBRequest<SavedHunt | undefined>);
}

export function deleteHunt(id: string): Promise<undefined> {
  return tx("readwrite", (store) => store.delete(id) as IDBRequest<undefined>);
}

/** All saved hunts, newest first. */
export async function listHunts(): Promise<SavedHunt[]> {
  const all = await tx<SavedHunt[]>("readonly", (store) => store.getAll() as IDBRequest<SavedHunt[]>);
  return all.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}

/**
 * Record progress.
 *
 * Read-modify-write inside one transaction rather than two calls, so two quick taps on "Next" cannot
 * interleave and lose an update. A child tapping fast is a normal thing for a child to do.
 */
export function advanceHunt(id: string, toStop: number, finished = false): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE, "readwrite");
        const store = transaction.objectStore(STORE);
        const request = store.get(id) as IDBRequest<SavedHunt | undefined>;

        request.onsuccess = () => {
          const hunt = request.result;
          if (!hunt) {
            reject(new Error("That hunt is no longer on this device."));
            return;
          }
          hunt.currentStop = toStop;
          if (finished) hunt.finishedAt = new Date().toISOString();
          store.put(hunt);
        };

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("Could not save progress."));
        transaction.onabort = () => reject(transaction.error ?? new Error("Could not save progress."));
      }),
  );
}

/** Used by the privacy self-test and by the parent panel's "clear everything". */
export function clearAll(): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE, "readwrite");
        transaction.objectStore(STORE).clear();
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("Could not clear hunts."));
      }),
  );
}