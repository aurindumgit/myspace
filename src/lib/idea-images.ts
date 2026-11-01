const DATABASE_NAME = "commonplace-idea-images";
const STORE_NAME = "images";

export async function compressIdeaImage(file: File): Promise<Blob> {
  if (
    file.size < 512 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    typeof createImageBitmap === "undefined"
  ) {
    return file;
  }

  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1920 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image compression is unavailable.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const compressed = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("This image could not be compressed.")),
        "image/webp",
        0.82,
      );
    });
    return compressed.size < file.size ? compressed : file;
  } finally {
    image.close();
  }
}

function openDatabase() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Image storage is not available in this browser."));
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open image storage."));
  });
}

export async function saveIdeaImage(id: string, image: Blob) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(image, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Could not save this image."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Image storage was interrupted."));
  }).finally(() => database.close());
}

export async function loadIdeaImage(id: string) {
  const database = await openDatabase();
  return new Promise<Blob | undefined>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not read this image."));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not read this image."));
    };
  });
}

export async function deleteIdeaImage(id: string) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Could not remove this image."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Image removal was interrupted."));
  }).finally(() => database.close());
}
