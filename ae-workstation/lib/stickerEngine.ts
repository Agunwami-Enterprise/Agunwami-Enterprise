import { openDB, DBSchema, IDBPDatabase } from "idb";

interface StickerDB extends DBSchema {
  stickers: {
    key: string;
    value: {
      id: string;
      blob: Blob;
      createdAt: number;
    };
  };
}

const DB_NAME = "aehub_chat_stickers";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<StickerDB>> | null = null;

function getStickerDB() {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB<StickerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("stickers")) {
          db.createObjectStore("stickers", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function storeLocalSticker(id: string, blob: Blob): Promise<void> {
  const db = await getStickerDB();
  if (!db) return;
  await db.put("stickers", {
    id,
    blob,
    createdAt: Date.now(),
  });
}

export async function getLocalSticker(id: string): Promise<Blob | null> {
  const db = await getStickerDB();
  if (!db) return null;
  const record = await db.get("stickers", id);
  return record ? record.blob : null;
}

export async function deleteLocalSticker(id: string): Promise<void> {
  const db = await getStickerDB();
  if (!db) return;
  await db.delete("stickers", id);
}

export async function getAllLocalStickers(): Promise<Array<{ id: string; url: string; blob: Blob }>> {
  const db = await getStickerDB();
  if (!db) return [];
  const records = await db.getAll("stickers");
  return records.map((record) => ({
    id: record.id,
    url: URL.createObjectURL(record.blob),
    blob: record.blob,
  }));
}

export async function compressStickerImage(
  file: File,
  maxSizeBytes: number = 50 * 1024
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      const MAX_DIM = 256;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.85;
      const attemptCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas toBlob failed"));
              return;
            }
            if (blob.size <= maxSizeBytes || quality <= 0.1) {
              resolve(blob);
            } else {
              quality -= 0.15;
              attemptCompress();
            }
          },
          "image/webp",
          quality
        );
      };

      attemptCompress();
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}
