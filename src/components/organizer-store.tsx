"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import type {
  CaptureDraft,
  ItemType,
  OrganizerItem,
  OrganizerSpace,
} from "@/lib/organizer";

const STORAGE_KEY = "commonplace-organizer-v1";

type StoreData = {
  items: OrganizerItem[];
  spaces: OrganizerSpace[];
  tags: string[];
};

type StoreSnapshot = StoreData & {
  hydrated: boolean;
};

type OrganizerStoreValue = StoreSnapshot & {
  saveCapture: (
    draft: CaptureDraft,
    spaceName: string | null,
  ) => string;
  updateItem: (id: string, updates: Partial<OrganizerItem>) => void;
  deleteItem: (id: string) => void;
  createSpace: (name: string) => void;
  deleteSpace: (id: string) => void;
  suggestedSpace: (type: ItemType) => OrganizerSpace | undefined;
};

const serverSnapshot: StoreSnapshot = {
  items: [],
  spaces: [],
  tags: [],
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
    if (!saved) return { items: [], spaces: [], tags: [], hydrated: true };

    const parsed = JSON.parse(saved) as {
      items?: unknown;
      spaces?: unknown;
      tags?: unknown;
      categories?: unknown;
    };
    const savedSpaces = Array.isArray(parsed.spaces)
      ? parsed.spaces
      : Array.isArray(parsed.categories)
        ? parsed.categories
        : [];
    const spaces = savedSpaces as OrganizerSpace[];
    const items = Array.isArray(parsed.items)
      ? parsed.items.map((savedItem) => {
          const item = savedItem as OrganizerItem & { categoryId?: string };
          const { categoryId, ...rest } = item;
          return {
            ...rest,
            spaceId: item.spaceId ?? categoryId,
            tags: Array.isArray(item.tags) ? item.tags : [],
          };
        })
      : [];
    const itemTags = items.flatMap((item) => item.tags ?? []);

    return {
      items,
      spaces,
      tags: uniqueNames([
        ...(Array.isArray(parsed.tags) ? (parsed.tags as string[]) : []),
        ...itemTags,
      ]),
      hydrated: true,
    };
  } catch (error) {
    console.error("Could not read saved Commonplace data.", error);
    return { items: [], spaces: [], tags: [], hydrated: true };
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

function saveSnapshot(next: StoreSnapshot) {
  snapshot = next;
  notify();

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        items: next.items,
        spaces: next.spaces,
        tags: next.tags,
      }),
    );
  } catch (error) {
    console.error("Could not save Commonplace data in this browser.", error);
  }
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
  const expenseDrafts =
    draft.type === "expense" && draft.expenses?.length ? draft.expenses : [null];
  const normalizedTags = uniqueNames(
    expenseDrafts.flatMap((expense) => expense?.tags ?? []),
  );
  const createdAt = new Date().toISOString();
  const items = expenseDrafts.map((expense) => ({
    id: crypto.randomUUID(),
    type: draft.type,
    title: expense?.title ?? draft.title,
    rawText: draft.rawText,
    spaceId: draft.type === "expense" ? undefined : space?.id,
    tags: draft.type === "expense" ? uniqueNames(expense?.tags ?? []) : undefined,
    createdAt,
    dueAt: draft.dueAt,
    amount: expense?.amount ?? undefined,
    currency: expense?.currency || undefined,
    transactionKind: expense?.transactionKind,
    entries:
      draft.type === "list"
        ? (draft.entries ?? []).map((text) => ({ text, done: false }))
        : undefined,
  })) satisfies OrganizerItem[];

  saveSnapshot({
    spaces:
      space && !snapshot.spaces.some((existing) => existing.id === space.id)
        ? [...snapshot.spaces, space]
        : snapshot.spaces,
    tags: uniqueNames([...snapshot.tags, ...normalizedTags]),
    items: [...items, ...snapshot.items],
    hydrated: true,
  });

  return items[0].id;
}

function updateItem(id: string, updates: Partial<OrganizerItem>) {
  const nextTags = updates.tags
    ? uniqueNames([...snapshot.tags, ...updates.tags])
    : snapshot.tags;
  saveSnapshot({
    ...snapshot,
    tags: nextTags,
    items: snapshot.items.map((item) =>
      item.id === id ? { ...item, ...updates } : item,
    ),
  });
}

function deleteItem(id: string) {
  saveSnapshot({
    ...snapshot,
    items: snapshot.items.filter((item) => item.id !== id),
  });
}

function createSpace(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const space = getOrCreateSpace(trimmed);
  if (snapshot.spaces.some((existing) => existing.id === space.id)) return;

  saveSnapshot({
    ...snapshot,
    spaces: [...snapshot.spaces, space],
  });
}

function deleteSpace(id: string) {
  saveSnapshot({
    ...snapshot,
    spaces: snapshot.spaces.filter((space) => space.id !== id),
    items: snapshot.items.map((item) =>
      item.spaceId === id ? { ...item, spaceId: undefined } : item,
    ),
  });
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
