import {
  itemTypes,
  type OrganizerItem,
  type OrganizerSpace,
} from "@/lib/organizer";
import { loadIdeaImage } from "@/lib/idea-images";

type BackupData = {
  items: OrganizerItem[];
  spaces: OrganizerSpace[];
  tags: string[];
  ideaTags: string[];
};

export type OrganizerBackup = {
  format: "myspace-backup";
  version: 1;
  exportedAt: string;
  data: BackupData;
  images: { id: string; dataUrl: string }[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown) {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isValidItem(value: unknown): value is OrganizerItem {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.rawText !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.type !== "string" ||
    !itemTypes.some((type) => type === value.type)
  ) {
    return false;
  }
  if (
    (value.spaceId !== undefined && typeof value.spaceId !== "string") ||
    (value.done !== undefined && typeof value.done !== "boolean") ||
    (value.dueAt !== undefined && typeof value.dueAt !== "string") ||
    (value.body !== undefined && typeof value.body !== "string") ||
    (value.link !== undefined && typeof value.link !== "string") ||
    (value.imageId !== undefined && typeof value.imageId !== "string") ||
    (value.amount !== undefined && typeof value.amount !== "number") ||
    (value.currency !== undefined && typeof value.currency !== "string") ||
    (value.transactionKind !== undefined &&
      value.transactionKind !== "income" &&
      value.transactionKind !== "expense") ||
    (value.tags !== undefined && !isStringArray(value.tags)) ||
    (value.ingredients !== undefined && !isStringArray(value.ingredients)) ||
    (value.steps !== undefined && !isStringArray(value.steps))
  ) {
    return false;
  }
  if (
    value.entries !== undefined &&
    (!Array.isArray(value.entries) ||
      !value.entries.every(
        (entry) =>
          isRecord(entry) &&
          typeof entry.text === "string" &&
          typeof entry.done === "boolean",
      ))
  ) {
    return false;
  }
  if (
    value.expenses !== undefined &&
    (!Array.isArray(value.expenses) ||
      !value.expenses.every(
        (expense) =>
          isRecord(expense) &&
          typeof expense.title === "string" &&
          (expense.amount === null || typeof expense.amount === "number") &&
          typeof expense.currency === "string" &&
          (expense.transactionKind === "income" ||
            expense.transactionKind === "expense") &&
          (expense.id === undefined || typeof expense.id === "string") &&
          (expense.tags === undefined || isStringArray(expense.tags)),
      ))
  ) {
    return false;
  }
  return true;
}

function isValidSpace(value: unknown): value is OrganizerSpace {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.color === "string"
  );
}

function isValidSpaces(value: unknown): value is OrganizerSpace[] {
  return Array.isArray(value) && value.every(isValidSpace);
}

function isValidImages(
  value: unknown,
): value is OrganizerBackup["images"] {
  return (
    Array.isArray(value) &&
    value.every(
      (image) =>
        isRecord(image) &&
        typeof image.id === "string" &&
        typeof image.dataUrl === "string" &&
        /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/]+={0,2}$/i.test(
          image.dataUrl,
        ),
    )
  );
}

function isValidBackupData(value: unknown): value is BackupData {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isValidItem) &&
    isValidSpaces(value.spaces) &&
    isStringArray(value.tags) &&
    isStringArray(value.ideaTags)
  );
}

function isValidBackup(value: unknown): value is OrganizerBackup {
  return (
    isRecord(value) &&
    value.format === "myspace-backup" &&
    value.version === 1 &&
    typeof value.exportedAt === "string" &&
    isValidBackupData(value.data) &&
    isValidImages(value.images)
  );
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read an image for backup."));
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not read an image for backup."));
    reader.readAsDataURL(blob);
  });
}

export async function createOrganizerBackup(
  data: BackupData,
): Promise<OrganizerBackup> {
  const imageIds = [
    ...new Set(
      data.items
        .map((item) => item.imageId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const images = await Promise.all(
    imageIds.map(async (id) => {
      const image = await loadIdeaImage(id);
      if (!image) {
        throw new Error("A saved idea image is missing; backup was not created.");
      }
      return { id, dataUrl: await readBlobAsDataUrl(image) };
    }),
  );

  return {
    format: "myspace-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
    images,
  };
}

export function parseOrganizerBackup(value: unknown): OrganizerBackup {
  if (!isValidBackup(value)) {
    throw new Error("This is not a valid myspace backup.");
  }

  const imageIds = new Set(value.images.map((image) => image.id));
  if (
    imageIds.size !== value.images.length ||
    value.data.items.some(
      (item) =>
        item.imageId !== undefined &&
        !imageIds.has(item.imageId),
    )
  ) {
    throw new Error("The backup is missing one or more saved images.");
  }

  return value;
}

export function decodeBackupImage(dataUrl: string) {
  const [metadata, encoded] = dataUrl.split(",", 2);
  const mimeType = metadata?.match(/^data:(image\/[a-z0-9.+-]+);base64$/i)?.[1];
  if (!mimeType || encoded === undefined) {
    throw new Error("The backup contains an invalid image.");
  }

  const bytes = Uint8Array.from(atob(encoded), (character) =>
    character.charCodeAt(0),
  );
  return new Blob([bytes], { type: mimeType });
}
