"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import type {
  CaptureDraft,
  ItemType,
  OrganizerItem,
  OrganizerSpace,
} from "@/lib/organizer";
import { createCaptureDraft } from "@/lib/organizer";
import {
  createOrganizerBackup,
  decodeBackupImage,
  parseOrganizerBackup,
  type OrganizerBackup,
} from "@/lib/organizer-backup";
import { deleteIdeaImage, saveIdeaImage } from "@/lib/idea-images";

const STORAGE_KEY = "commonplace-organizer-v1";

type StoreData = {
  items: OrganizerItem[];
  spaces: OrganizerSpace[];
  tags: string[];
  ideaTags: string[];
};

type StoreSnapshot = StoreData & {
  hydrated: boolean;
  storageError?: string;
  storageReadFailed?: boolean;
};

type OrganizerStoreValue = StoreSnapshot & {
  saveCapture: (
    draft: CaptureDraft,
    spaceName: string | null,
  ) => { id: string; spaceId?: string } | null;
  updateItem: (id: string, updates: Partial<OrganizerItem>) => boolean;
  deleteItem: (id: string) => Promise<void>;
  createSpace: (name: string) => boolean;
  deleteSpace: (id: string) => boolean;
  retryStorage: () => void;
  createBackup: () => Promise<OrganizerBackup>;
  restoreBackup: (value: unknown) => Promise<boolean>;
  suggestedSpace: (type: ItemType) => OrganizerSpace | undefined;
};

const serverSnapshot: StoreSnapshot = {
  items: [],
  spaces: [],
  tags: [],
  ideaTags: [],
  hydrated: false,
};

let snapshot = serverSnapshot;
let initialized = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function uniqueNames(names: string[]) {
  return names.reduce<string[]>((result, name) => {
    const trimmed = name.trim();
    if (trimmed && !result.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
      result.push(trimmed);
    }
    return result;
  }, []);
}

function readStorage(): StoreSnapshot {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return { items: [], spaces: [], tags: [], ideaTags: [], hydrated: true };
    }

    const parsed = JSON.parse(saved) as {
      items?: unknown;
      spaces?: unknown;
      tags?: unknown;
      ideaTags?: unknown;
      categories?: unknown;
    };
    const savedSpaces = Array.isArray(parsed.spaces)
      ? parsed.spaces
      : Array.isArray(parsed.categories)
        ? parsed.categories
        : [];
    const spaces = savedSpaces as OrganizerSpace[];
    const savedItems: OrganizerItem[] = Array.isArray(parsed.items)
      ? parsed.items.map((savedItem) => {
          const item = savedItem as Omit<OrganizerItem, "type"> & {
            categoryId?: string;
            type: string;
          };
          const { categoryId, ...rest } = item;
          const type =
            item.type === "moodboard"
              ? "idea"
              : item.type === "recipe" || item.type === "idea"
                ? item.type
                : item.type === "reminder" ||
                    item.type === "expense" ||
                    item.type === "list"
                  ? item.type
                  : "note";
          return ({
            ...rest,
            type: type as ItemType,
            spaceId: item.spaceId ?? categoryId,
            tags: Array.isArray(item.tags) ? item.tags : [],
          }) as OrganizerItem;
        })
      : [];
    const expenseGroups = new Map<string, { index: number; items: OrganizerItem[] }>();
    const itemsWithGroups: (OrganizerItem | null)[] = savedItems.map((item, index) => {
      if (item.type !== "expense" || item.expenses) return item;
      const key =
        item.rawText && item.createdAt
          ? `${item.createdAt}\u0000${item.rawText}`
          : `legacy-expense-${item.id}`;
      const group = expenseGroups.get(key);
      if (group) group.items.push(item);
      else expenseGroups.set(key, { index, items: [item] });
      return null;
    });
    for (const { index, items: group } of expenseGroups.values()) {
      const first = group[0];
      if (!first) continue;
      const parsedDraft = createCaptureDraft("expense", first.rawText);
      const lines = group.map((item) => ({
        id: item.id,
        title: item.title,
        amount: item.amount ?? null,
        currency: item.currency ?? "",
        transactionKind: item.transactionKind ?? "expense",
        tags: item.tags ?? [],
      }));
      const base = { ...first };
      delete base.amount;
      delete base.currency;
      delete base.transactionKind;
      delete base.tags;
      itemsWithGroups[index] = {
        ...base,
        title: group.length > 1 ? parsedDraft.title : first.title,
        expenses: lines,
      };
    }
    const items = itemsWithGroups.filter(
      (item): item is OrganizerItem => item !== null,
    );
    const itemExpenseTags = items.flatMap((item) =>
      item.expenses?.flatMap((expense) => expense.tags ?? []) ?? [],
    );
    const itemIdeaTags = items
      .filter((item) => item.type === "idea")
      .flatMap((item) => item.tags ?? []);
    const itemTags = items.flatMap((item) => item.tags ?? []);

    return {
      items,
      spaces,
      tags: uniqueNames([
        ...(Array.isArray(parsed.tags) ? (parsed.tags as string[]) : []),
        ...itemExpenseTags,
        ...itemTags.filter((tag) => !itemIdeaTags.includes(tag)),
      ]),
      ideaTags: uniqueNames([
        ...(Array.isArray(parsed.ideaTags) ? (parsed.ideaTags as string[]) : []),
        ...itemIdeaTags,
      ]),
      hydrated: true,
    };
  } catch (error) {
    console.error("Could not read saved Commonplace data.", error);
    return {
      items: [],
      spaces: [],
      tags: [],
      ideaTags: [],
      hydrated: true,
      storageReadFailed: true,
      storageError:
        "Saved data could not be read. Changes are paused to protect it; check browser storage and retry.",
    };
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  if (!initialized && typeof window !== "undefined") {
    initialized = true;
    snapshot = readStorage();
  }

  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return serverSnapshot;
}

function saveSnapshot(next: StoreSnapshot, allowReadFailure = false) {
  if (snapshot.storageReadFailed && !allowReadFailure) return false;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        items: next.items,
        spaces: next.spaces,
        tags: next.tags,
        ideaTags: next.ideaTags,
      }),
    );
  } catch (error) {
    console.error("Could not save Commonplace data in this browser.", error);
    snapshot = {
      ...snapshot,
      storageError:
        "Changes could not be saved in this browser. Free storage space or check browser settings, then try again.",
    };
    notify();
    return false;
  }

  snapshot = { ...next, storageError: undefined, storageReadFailed: false };
  notify();
  return true;
}

function getOrCreateSpace(name: string) {
  const existing = snapshot.spaces.find(
    (space) => space.name.toLowerCase() === name.toLowerCase(),
  );
  if (existing) return existing;

  return {
    id: crypto.randomUUID(),
    name,
    color: "#8fa8d8",
  } satisfies OrganizerSpace;
}

function saveCapture(draft: CaptureDraft, spaceName: string | null) {
  const space = spaceName ? getOrCreateSpace(spaceName) : undefined;
  const createdAt = new Date().toISOString();
  const expenses =
    draft.type === "expense"
      ? (draft.expenses ?? []).map((expense) => ({
          ...expense,
          id: expense.id ?? crypto.randomUUID(),
          tags: uniqueNames(expense.tags ?? []),
        }))
      : undefined;
  const item: OrganizerItem = {
    id: crypto.randomUUID(),
    type: draft.type,
    title: draft.title,
    rawText: draft.rawText,
    spaceId: draft.type === "expense" ? undefined : space?.id,
    tags: draft.type === "idea" ? uniqueNames(draft.tags ?? []) : undefined,
    createdAt,
    dueAt: draft.dueAt,
    expenses,
    body: draft.body,
    ingredients: draft.ingredients,
    steps: draft.steps,
    link: draft.link,
    imageId: draft.imageId,
    entries:
      draft.type === "list"
        ? (draft.entries ?? []).map((text) => ({ text, done: false }))
        : undefined,
  };

  const saved = saveSnapshot({
    spaces:
      space && !snapshot.spaces.some((existing) => existing.id === space.id)
        ? [...snapshot.spaces, space]
        : snapshot.spaces,
    tags: uniqueNames([
      ...snapshot.tags,
      ...(expenses?.flatMap((expense) => expense.tags ?? []) ?? []),
    ]),
    ideaTags:
      draft.type === "idea"
        ? uniqueNames([...snapshot.ideaTags, ...(draft.tags ?? [])])
        : snapshot.ideaTags,
    items: [item, ...snapshot.items],
    hydrated: true,
  });

  return saved ? { id: item.id, spaceId: item.spaceId } : null;
}

function updateItem(id: string, updates: Partial<OrganizerItem>) {
  const item = snapshot.items.find((entry) => entry.id === id);
  const type = updates.type ?? item?.type;
  const updatedExpenseTags =
    type === "expense"
      ? updates.expenses?.flatMap((expense) => expense.tags ?? []) ?? []
      : [];
  const nextTags = updatedExpenseTags.length
    ? uniqueNames([...snapshot.tags, ...updatedExpenseTags])
    : type === "idea" && updates.tags
      ? snapshot.tags
      : updates.tags
        ? uniqueNames([...snapshot.tags, ...updates.tags])
        : snapshot.tags;
  return saveSnapshot({
    ...snapshot,
    tags: nextTags,
    ideaTags:
      type === "idea" && updates.tags
        ? uniqueNames([...snapshot.ideaTags, ...updates.tags])
        : snapshot.ideaTags,
    items: snapshot.items.map((item) =>
      item.id === id ? { ...item, ...updates } : item,
    ),
  });
}

async function deleteItem(id: string) {
  const item = snapshot.items.find((entry) => entry.id === id);
  const saved = saveSnapshot({
    ...snapshot,
    items: snapshot.items.filter((item) => item.id !== id),
  });
  if (saved && item?.imageId) {
    try {
      await deleteIdeaImage(item.imageId);
    } catch (error) {
      console.error("Could not remove the deleted item's image.", error);
      snapshot = {
        ...snapshot,
        storageError:
          "The item was deleted, but its image could not be removed from browser storage.",
      };
      notify();
    }
  }
}

function createSpace(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const space = getOrCreateSpace(trimmed);
  if (snapshot.spaces.some((existing) => existing.id === space.id)) return true;

  return saveSnapshot({
    ...snapshot,
    spaces: [...snapshot.spaces, space],
  });
}

function deleteSpace(id: string) {
  return saveSnapshot({
    ...snapshot,
    spaces: snapshot.spaces.filter((space) => space.id !== id),
    items: snapshot.items.map((item) =>
      item.spaceId === id ? { ...item, spaceId: undefined } : item,
    ),
  });
}

function retryStorage() {
  snapshot = readStorage();
  notify();
}

async function createBackup() {
  if (snapshot.storageReadFailed) {
    throw new Error("Saved data could not be read, so a backup cannot be created.");
  }
  return createOrganizerBackup({
    items: snapshot.items,
    spaces: snapshot.spaces,
    tags: snapshot.tags,
    ideaTags: snapshot.ideaTags,
  });
}

async function restoreBackup(value: unknown) {
  const backup = parseOrganizerBackup(value);
  const previousImageIds = snapshot.items
    .map((item) => item.imageId)
    .filter((id): id is string => Boolean(id));
  const imageIdMap = new Map(
    backup.images.map((image) => [image.id, crypto.randomUUID()]),
  );
  const addedImageIds: string[] = [];

  try {
    for (const image of backup.images) {
      const newId = imageIdMap.get(image.id);
      if (!newId) throw new Error("The backup contains an invalid image.");
      await saveIdeaImage(newId, decodeBackupImage(image.dataUrl));
      addedImageIds.push(newId);
    }

    const items = backup.data.items.map((item) => ({
      ...item,
      imageId: item.imageId ? imageIdMap.get(item.imageId) : undefined,
    }));
    const saved = saveSnapshot(
      {
        items,
        spaces: backup.data.spaces,
        tags: backup.data.tags,
        ideaTags: backup.data.ideaTags,
        hydrated: true,
      },
      true,
    );
    if (!saved) {
      await Promise.allSettled(addedImageIds.map((id) => deleteIdeaImage(id)));
      return false;
    }

    const cleanupResults = await Promise.allSettled(
      previousImageIds.map((id) => deleteIdeaImage(id)),
    );
    if (cleanupResults.some((result) => result.status === "rejected")) {
      console.error("Could not remove every image from the previous data.");
      snapshot = {
        ...snapshot,
        storageError:
          "Data was restored, but some old images could not be removed from browser storage.",
      };
      notify();
    }
    return true;
  } catch (error) {
    await Promise.allSettled(addedImageIds.map((id) => deleteIdeaImage(id)));
    throw error;
  }
}

function suggestedSpace(type: ItemType) {
  const latestItem = snapshot.items.find(
    (item) => item.type === type && item.spaceId,
  );
  return snapshot.spaces.find((space) => space.id === latestItem?.spaceId);
}

const OrganizerStore = createContext<OrganizerStoreValue | null>(null);

export function OrganizerStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const value: OrganizerStoreValue = {
    ...data,
    saveCapture,
    updateItem,
    deleteItem,
    createSpace,
    deleteSpace,
    retryStorage,
    createBackup,
    restoreBackup,
    suggestedSpace,
  };

  return <OrganizerStore.Provider value={value}>{children}</OrganizerStore.Provider>;
}

export function useOrganizerStore() {
  const value = useContext(OrganizerStore);
  if (!value) {
    throw new Error("useOrganizerStore must be used inside OrganizerStoreProvider.");
  }
  return value;
}
