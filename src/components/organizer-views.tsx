"use client";

import Link from "next/link";
import { Suspense, useMemo, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Archive,
  CalendarDays,
  Check,
  Clock3,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  Save,
  ShoppingBasket,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  createCaptureDraft,
  itemTypes,
  type ItemType,
  type OrganizerItem,
  type OrganizerSpace,
  type TransactionKind,
  typeLabels,
} from "@/lib/organizer";
import { useOrganizerStore } from "@/components/organizer-store";
import { Picker } from "@/components/picker";
import { TagPicker } from "@/components/tag-picker";

function formatDay(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatMoney(amount?: number, currency = "") {
  if (amount === undefined) return "Amount not detected";
  const currencyCodes: Record<string, string> = {
    "₹": "INR",
    "$": "USD",
    "€": "EUR",
    "£": "GBP",
    "¥": "JPY",
    INR: "INR",
    USD: "USD",
    EUR: "EUR",
    GBP: "GBP",
    JPY: "JPY",
  };
  const code = currencyCodes[currency];

  if (!code) {
    return `${currency ? `${currency} ` : ""}${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 2,
  }).format(amount);
}

function ItemTypeBadge({
  type,
  transactionKind,
}: {
  type: ItemType;
  transactionKind?: TransactionKind;
}) {
  const Icon =
    type === "reminder"
      ? CalendarDays
      : type === "expense"
        ? ReceiptText
        : type === "list"
          ? ShoppingBasket
          : type === "moodboard"
            ? Sparkles
            : Archive;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-[#aaa7a4]">
      <Icon size={13} />
      {type === "expense"
        ? transactionKind === "income"
          ? "Income"
          : "Expense"
        : typeLabels[type]}
    </span>
  );
}

function SavedItemCard({ item }: { item: OrganizerItem }) {
  const { spaces, tags, deleteItem, updateItem } = useOrganizerStore();
  const space = spaces.find((entry) => entry.id === item.spaceId);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showAllContent, setShowAllContent] = useState(false);
  const [editType, setEditType] = useState(item.type);
  const [editSpaceId, setEditSpaceId] = useState(item.spaceId ?? "none");
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body ?? item.rawText);
  const [entries, setEntries] = useState(item.entries ?? []);
  const [newEntry, setNewEntry] = useState("");
  const [dueAt, setDueAt] = useState(toDateTimeLocal(item.dueAt));
  const [amount, setAmount] = useState(item.amount?.toString() ?? "");
  const [currency, setCurrency] = useState(item.currency ?? "");
  const [transactionKind, setTransactionKind] = useState<TransactionKind>(
    item.transactionKind ?? "expense",
  );
  const [editTags, setEditTags] = useState(item.tags ?? []);
  const [editError, setEditError] = useState("");

  function startEditing() {
    setEditType(item.type);
    setEditSpaceId(item.spaceId ?? "none");
    setTitle(item.title);
    setBody(item.body ?? item.rawText);
    setEntries(item.entries ?? []);
    setNewEntry("");
    setDueAt(toDateTimeLocal(item.dueAt));
    setAmount(item.amount?.toString() ?? "");
    setCurrency(item.currency ?? "");
    setTransactionKind(item.transactionKind ?? "expense");
    setEditTags(item.tags ?? []);
    setEditError("");
    setEditing(true);
    setConfirmDelete(false);
  }

  function changeType(type: ItemType) {
    const draft = createCaptureDraft(type, item.rawText, item.dueAt);
    setEditType(type);
    setTitle(draft.title);
    setBody(item.rawText);
    setEntries((draft.entries ?? []).map((text) => ({ text, done: false })));
    if (draft.type === "expense") {
      const expense = draft.expenses?.[0];
      setAmount(expense?.amount?.toString() ?? "");
      setCurrency(expense?.currency ?? "");
      setTransactionKind(expense?.transactionKind ?? "expense");
    }
    if (draft.type === "reminder") setDueAt(toDateTimeLocal(draft.dueAt));
  }

  function saveEdits() {
    if (!title.trim()) {
      setEditError("Add a title before saving.");
      return;
    }
    if (editType === "list" && entries.every((entry) => !entry.text.trim())) {
      setEditError("Add at least one list item.");
      return;
    }

    updateItem(item.id, {
      type: editType,
      title: title.trim(),
      body: editType === "note" || editType === "moodboard" ? body : undefined,
      entries:
        editType === "list"
          ? entries.filter((entry) => entry.text.trim())
          : undefined,
      dueAt: editType === "reminder" && dueAt ? new Date(dueAt).toISOString() : undefined,
      amount:
        editType === "expense" && amount.trim() ? Number(amount) : undefined,
      currency: editType === "expense" ? currency.trim() || undefined : undefined,
      transactionKind:
        editType === "expense" ? transactionKind : undefined,
      spaceId:
        editType !== "expense" && editSpaceId !== "none"
          ? editSpaceId
          : undefined,
      tags: editType === "expense" ? editTags : undefined,
    });
    setEditing(false);
    setEditError("");
  }

  return (
    <article
      className="scroll-mt-24 rounded-2xl border border-white/[0.08] bg-[#1d1b1c] p-3 sm:p-4"
      id={item.id}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="serif-heading text-lg leading-snug text-[#f3efe9] sm:text-xl">
            {item.title}
          </p>
          <p className="mt-1 text-xs text-[#8e8a89]">
            {space && item.type !== "expense" ? `${space.name} · ` : ""}
            {formatDay(item.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ItemTypeBadge type={item.type} transactionKind={item.transactionKind} />
          <details className="relative">
            <summary
              aria-label="More actions"
              className="grid size-8 cursor-pointer list-none place-items-center rounded-full text-[#aaa7a4] hover:bg-white/[0.07] hover:text-white [&::-webkit-details-marker]:hidden"
            >
              <MoreHorizontal size={19} />
            </summary>
            <div className="absolute right-0 top-full z-20 mt-1 min-w-44 rounded-xl border border-white/10 bg-[#242225] p-1.5 shadow-xl">
              <button
                className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-[#d9d4d0] hover:bg-white/[0.07]"
                onClick={(event) => {
                  event.currentTarget.closest("details")?.removeAttribute("open");
                  if (editing) setEditing(false);
                  else startEditing();
                }}
                type="button"
              >
                {editing ? <X size={15} /> : <Pencil size={15} />}
                {editing ? "Cancel edit" : "Edit"}
              </button>
              <button
                className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-[#d9d4d0] hover:bg-white/[0.07]"
                onClick={(event) => {
                  event.currentTarget.closest("details")?.removeAttribute("open");
                  setShowOriginal((current) => !current);
                }}
                type="button"
              >
                <Archive size={15} />
                {showOriginal ? "Hide original text" : "Original text"}
              </button>
              <button
                className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-[#c98e89] hover:bg-white/[0.07]"
                onClick={(event) => {
                  event.currentTarget.closest("details")?.removeAttribute("open");
                  setConfirmDelete((current) => !current);
                }}
                type="button"
              >
                <Trash2 size={15} />
                Delete
              </button>
            </div>
          </details>
        </div>
      </div>

      {item.type === "reminder" && item.dueAt && (
        <div className="mt-2 flex items-center gap-2 text-sm text-[#cbc8c5]">
          <Clock3 size={16} className="text-[#9fb5e3]" />
          {formatDay(item.dueAt)}
          <span className="text-[#858181]">·</span>
          {new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            minute: "2-digit",
          }).format(new Date(item.dueAt))}
        </div>
      )}

      {item.type === "expense" && (
        <p
          className={`mt-2 text-base font-medium ${
            item.transactionKind === "income" ? "text-[#b8d5b3]" : "text-[#c4d2ec]"
          }`}
        >
          {formatMoney(item.amount, item.currency)}
        </p>
      )}
      {item.type === "expense" && (item.tags?.length ?? 0) > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.tags?.map((tag) => (
            <span
              className="rounded-full bg-white/[0.06] px-2 py-1 text-[10px] text-[#aaa7a4]"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {item.type === "list" && item.entries && (
        <>
          <ul className="mt-2 divide-y divide-white/[0.06] rounded-xl bg-[#171617] px-3">
            {item.entries
              .slice(0, showAllContent ? item.entries.length : 4)
              .map((entry, index) => (
            <li
              className="flex items-center gap-3 py-2"
              key={`${item.id}-${index}`}
            >
              <button
                aria-label={`${entry.done ? "Uncheck" : "Check"} ${entry.text}`}
                aria-pressed={entry.done}
                className={`grid size-5 shrink-0 place-items-center rounded-full border transition ${
                  entry.done
                    ? "border-[#9fb5e3] bg-[#9fb5e3] text-[#14171d]"
                    : "border-[#686467] text-transparent hover:border-[#9fb5e3]"
                }`}
                onClick={() =>
                  updateItem(item.id, {
                    entries: item.entries?.map((current, entryIndex) =>
                      entryIndex === index
                        ? { ...current, done: !current.done }
                        : current,
                    ),
                  })
                }
                type="button"
              >
                {entry.done && <Check size={13} />}
              </button>
              <span
                className={`min-w-0 flex-1 text-sm ${
                  entry.done ? "text-[#777376] line-through" : "text-[#e7e3df]"
                }`}
              >
                {entry.text}
              </span>
            </li>
              ))}
          </ul>
          {item.entries.length > 4 && (
            <button
              className="mt-2 text-xs text-[#9fb5e3] hover:text-white"
              onClick={() => setShowAllContent((current) => !current)}
              type="button"
            >
              {showAllContent
                ? "Show fewer items"
                : `Show all ${item.entries.length} items`}
            </button>
          )}
        </>
      )}

      {(item.type === "note" || item.type === "moodboard") && (
        <>
          <p
            className={`mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#b8b4b1] ${
              showAllContent ? "" : "line-clamp-3"
            }`}
          >
            {item.body ?? item.rawText}
          </p>
          {((item.body ?? item.rawText).length > 160 ||
            (item.body ?? item.rawText).includes("\n")) && (
            <button
              className="mt-1 text-xs text-[#9fb5e3] hover:text-white"
              onClick={() => setShowAllContent((current) => !current)}
              type="button"
            >
              {showAllContent ? "Show less" : "Read more"}
            </button>
          )}
        </>
      )}

      {item.type === "reminder" && (
        <button
          aria-pressed={item.done}
          className={`mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs transition ${
            item.done
              ? "bg-[#29272a] text-[#a19da0]"
              : "bg-[#35496d] text-[#e2eafb] hover:bg-[#425a84]"
          }`}
          onClick={() => updateItem(item.id, { done: !item.done })}
          type="button"
        >
          <Check size={14} />
          {item.done ? "Completed" : "Mark done"}
        </button>
      )}

      {showOriginal && !editing && (
        <p className="mt-2 whitespace-pre-wrap break-words border-t border-white/[0.06] pt-2 text-sm leading-6 text-[#b8b4b1]">
          {item.rawText}
        </p>
      )}

      {confirmDelete && (
        <div className="mt-2 flex min-h-9 flex-wrap items-center gap-2 rounded-xl border border-[#8a514c]/30 bg-[#492a2a]/25 px-3 py-2">
          <span className="mr-auto text-xs text-[#e2c6c2]">
            Delete this item permanently?
          </span>
          <button
            className="rounded-full px-3 py-1 text-xs text-[#d5cfcc] hover:bg-white/[0.08]"
            onClick={() => setConfirmDelete(false)}
            type="button"
          >
            Keep it
          </button>
          <button
            className="rounded-full bg-[#8a514c] px-3 py-1 text-xs text-white hover:bg-[#a15f59]"
            onClick={() => deleteItem(item.id)}
            type="button"
          >
            Delete item
          </button>
        </div>
      )}

      {editing && (
        <div className="mt-3 space-y-4 rounded-2xl border border-white/[0.08] bg-[#171617] p-3 sm:p-4">
          {editType !== "expense" && (
            <div className="space-y-1.5">
              <p className="text-xs text-[#aaa6a4]">Space</p>
              <Picker
                label="Space"
                onChange={setEditSpaceId}
                options={[
                  { value: "none", label: "No space" },
                  ...spaces.map((entry: OrganizerSpace) => ({
                    value: entry.id,
                    label: entry.name,
                  })),
                ]}
                value={editSpaceId}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <p className="text-xs text-[#aaa6a4]">Type</p>
            <Picker
              label="Item type"
              onChange={(value) => {
                const nextType = itemTypes.find((type) => type === value);
                if (nextType) changeType(nextType);
              }}
              options={itemTypes.map((type) => ({
                value: type,
                label: typeLabels[type],
              }))}
              value={editType}
            />
          </div>

          <label className="block space-y-1.5 text-xs text-[#aaa6a4]">
            Title
            <input
              className="w-full rounded-xl border border-white/10 bg-[#211f21] px-3 py-2.5 text-sm text-[#f4f0e9] outline-none focus:border-[#9fb5e3]/60"
              onChange={(event) => setTitle(event.target.value)}
              value={title}
            />
          </label>

          {(editType === "note" || editType === "moodboard") && (
            <label className="block space-y-1.5 text-xs text-[#aaa6a4]">
              Content
              <textarea
                className="min-h-28 w-full resize-y rounded-xl border border-white/10 bg-[#211f21] px-3 py-2.5 text-sm leading-6 text-[#f4f0e9] outline-none focus:border-[#9fb5e3]/60"
                onChange={(event) => setBody(event.target.value)}
                value={body}
              />
            </label>
          )}

          {editType === "list" && (
            <div className="space-y-2">
              <p className="text-xs text-[#aaa6a4]">List items</p>
              {entries.map((entry, index) => (
                <div className="flex items-center gap-2" key={`${item.id}-edit-${index}`}>
                  <input
                    aria-label={`List item ${index + 1}`}
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#211f21] px-3 py-2.5 text-sm text-[#f4f0e9] outline-none focus:border-[#9fb5e3]/60"
                    onChange={(event) =>
                      setEntries((current) =>
                        current.map((value, valueIndex) =>
                          valueIndex === index
                            ? { ...value, text: event.target.value }
                            : value,
                        ),
                      )
                    }
                    value={entry.text}
                  />
                  <button
                    aria-label={`Remove ${entry.text || `item ${index + 1}`}`}
                    className="grid size-10 shrink-0 place-items-center rounded-full text-[#c98e89] hover:bg-white/[0.06]"
                    onClick={() =>
                      setEntries((current) =>
                        current.filter((_, valueIndex) => valueIndex !== index),
                      )
                    }
                    type="button"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  aria-label="New list item"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#211f21] px-3 py-2.5 text-sm text-[#f4f0e9] outline-none placeholder:text-[#777376] focus:border-[#9fb5e3]/60"
                  onChange={(event) => setNewEntry(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (newEntry.trim()) {
                        setEntries((current) => [
                          ...current,
                          { text: newEntry.trim(), done: false },
                        ]);
                        setNewEntry("");
                      }
                    }
                  }}
                  placeholder="Add an item"
                  value={newEntry}
                />
                <button
                  aria-label="Add list item"
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-[#35496d] text-[#e2eafb] hover:bg-[#425a84]"
                  onClick={() => {
                    if (!newEntry.trim()) return;
                    setEntries((current) => [
                      ...current,
                      { text: newEntry.trim(), done: false },
                    ]);
                    setNewEntry("");
                  }}
                  type="button"
                >
                  <Plus size={17} />
                </button>
              </div>
            </div>
          )}

          {editType === "reminder" && (
            <label className="block space-y-1.5 text-xs text-[#aaa6a4]">
              Reminder date and time
              <input
                className="w-full rounded-xl border border-white/10 bg-[#211f21] px-3 py-2.5 text-sm text-[#f4f0e9] outline-none color-scheme-dark focus:border-[#9fb5e3]/60"
                onChange={(event) => setDueAt(event.target.value)}
                type="datetime-local"
                value={dueAt}
              />
            </label>
          )}

          {editType === "expense" && (
            <>
              <TagPicker
                availableTags={tags}
                onChange={setEditTags}
                value={editTags}
              />
              <div className="space-y-1.5">
                <p className="text-xs text-[#aaa6a4]">Income or expense</p>
                <Picker
                  label="Transaction type"
                  onChange={(value) => {
                    if (value === "income" || value === "expense") {
                      setTransactionKind(value);
                    }
                  }}
                  options={[
                    { value: "expense", label: "Expense" },
                    { value: "income", label: "Income" },
                  ]}
                  value={transactionKind}
                />
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
                <label className="block space-y-1.5 text-xs text-[#aaa6a4]">
                  Amount
                  <input
                    className="w-full rounded-xl border border-white/10 bg-[#211f21] px-3 py-2.5 text-sm text-[#f4f0e9] outline-none focus:border-[#9fb5e3]/60"
                    inputMode="decimal"
                    min="0"
                    onChange={(event) => setAmount(event.target.value)}
                    step="0.01"
                    type="number"
                    value={amount}
                  />
                </label>
                <label className="block space-y-1.5 text-xs text-[#aaa6a4]">
                  Currency
                  <input
                    className="w-full rounded-xl border border-white/10 bg-[#211f21] px-3 py-2.5 text-sm text-[#f4f0e9] outline-none focus:border-[#9fb5e3]/60"
                    onChange={(event) => setCurrency(event.target.value)}
                    value={currency}
                  />
                </label>
              </div>
            </>
          )}

          {editError && (
            <p className="text-sm text-[#f19a91]" role="alert">
              {editError}
            </p>
          )}
          <button
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#9fb5e3] px-4 text-sm font-medium text-[#111318] transition hover:bg-[#b4c6e9]"
            onClick={saveEdits}
            type="button"
          >
            <Save size={16} />
            Save changes
          </button>
          <details className="border-t border-white/[0.06] pt-3">
            <summary className="cursor-pointer text-xs text-[#8e8a89] hover:text-[#d9d4d0]">
              Original captured text
            </summary>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#b8b4b1]">
              {item.rawText}
            </p>
          </details>
        </div>
      )}
    </article>
  );
}

function toDateTimeLocal(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function EmptyCollection({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Archive;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-white/[0.14] bg-white/[0.02] px-5 py-10 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#232225] text-[#9fb5e3]">
        <Icon size={20} />
      </span>
      <h2 className="serif-heading mt-4 text-xl text-[#f1ede7]">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#969190]">
        {description}
      </p>
    </div>
  );
}

function CurrentDate() {
  return (
    <p className="text-sm text-[#9e9997]">
      {new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(new Date())}
    </p>
  );
}

export function HomeView() {
  const { items, hydrated } = useOrganizerStore();
  const reminders = items
    .filter((item) => item.type === "reminder" && !item.done)
    .sort((a, b) => (a.dueAt ?? a.createdAt).localeCompare(b.dueAt ?? b.createdAt))
    .slice(0, 3);
  const recent = items.slice(0, 4);

  return (
    <div className="space-y-9">
      <section>
        <Suspense fallback={<p className="h-5 text-sm text-[#9e9997]">Today</p>}>
          <CurrentDate />
        </Suspense>
        <h1 className="serif-heading mt-2 max-w-2xl text-[2.4rem] leading-[1.08] tracking-tight text-[#f4f0e9] sm:text-5xl">
          Keep the little things close.
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-[#a39e9b] sm:text-base">
          A calm place for the things you want to remember.
        </p>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#858082]">
              Coming up
            </p>
            <h2 className="serif-heading mt-1 text-2xl text-[#f0ece6]">
              Reminders
            </h2>
          </div>
          <Link
            className="inline-flex items-center gap-1 text-sm text-[#a9bddf] hover:text-white"
            href="/reminders"
          >
            View all <ArrowUpRight size={15} />
          </Link>
        </div>
        {reminders.length ? (
          <div className="space-y-3">
            {reminders.map((item) => (
              <SavedItemCard item={item} key={item.id} />
            ))}
          </div>
        ) : (
          <div className="rounded-[22px] border border-white/[0.08] bg-[#1d1b1c] px-4 py-4">
            <p className="text-sm text-[#d9d4d0]">Nothing waiting on you.</p>
            <p className="mt-1 text-xs text-[#8e8a89]">
              Try “Remind me tomorrow to call home.”
            </p>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#858082]">
              Recently saved
            </p>
            <h2 className="serif-heading mt-1 text-2xl text-[#f0ece6]">
              Jump back in
            </h2>
          </div>
          {items.length > 0 && (
            <Link
              className="inline-flex items-center gap-1 text-sm text-[#a9bddf] hover:text-white"
              href="/library"
            >
              Library <ArrowUpRight size={15} />
            </Link>
          )}
        </div>
        {!hydrated ? (
          <p className="py-4 text-sm text-[#8e8a89]">Loading your saved items...</p>
        ) : recent.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {recent.map((item) => (
              <SavedItemCard item={item} key={item.id} />
            ))}
          </div>
        ) : (
          <EmptyCollection
            description="Type a thought into the box below. Commonplace will help shape it into the right kind of item."
            icon={Archive}
            title="Your space starts with a thought"
          />
        )}
      </section>
    </div>
  );
}

export function LibraryView() {
  const { items, spaces, hydrated, createSpace, deleteSpace } =
    useOrganizerStore();
  const [typeFilter, setTypeFilter] = useState<ItemType | "all">("all");
  const [spaceFilter, setSpaceFilter] = useState("all");
  const [manageSpaces, setManageSpaces] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [spaceToDelete, setSpaceToDelete] = useState<string | null>(null);
  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (typeFilter === "all" || item.type === typeFilter) &&
          (spaceFilter === "all" || item.spaceId === spaceFilter),
      ),
    [items, spaceFilter, typeFilter],
  );

  function handleCreateSpace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newSpaceName.trim()) return;
    createSpace(newSpaceName);
    setNewSpaceName("");
  }

  return (
    <div>
      <p className="text-sm text-[#9e9997]">Everything you&apos;ve kept</p>
      <h1 className="serif-heading mt-2 text-4xl text-[#f4f0e9] sm:text-5xl">
        Library
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-6 text-[#a39e9b]">
        Browse your reminders, expenses, lists, moodboards, and notes in one place.
      </p>

      <div className="mt-7 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(["all", ...itemTypes] as const).map((type) => (
          <button
            aria-pressed={typeFilter === type}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-xs transition ${
              typeFilter === type
                ? "border-[#9fb5e3] bg-[#35496d] text-white"
                : "border-white/10 text-[#aaa7a4] hover:border-white/25"
            }`}
            key={type}
            onClick={() => setTypeFilter(type)}
            type="button"
          >
            {type === "all" ? "Everything" : typeLabels[type]}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {spaces.length > 0 && (
          <div className="flex min-w-0 flex-1 items-center gap-3 text-xs text-[#8e8a89]">
            Space
            <div className="w-full max-w-[16rem]">
              <Picker
                label="Filter by Space"
                onChange={setSpaceFilter}
                options={[
                  { value: "all", label: "All spaces" },
                  ...spaces.map((space) => ({
                    value: space.id,
                    label: space.name,
                  })),
                ]}
                value={spaceFilter}
              />
            </div>
          </div>
        )}
        <button
          aria-expanded={manageSpaces}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-xs text-[#d9d4d0] hover:border-white/25"
          onClick={() => setManageSpaces((current) => !current)}
          type="button"
        >
          <Plus size={14} />
          {manageSpaces ? "Close spaces" : "Manage spaces"}
        </button>
      </div>

      {manageSpaces && (
        <section className="mt-4 rounded-2xl border border-white/[0.08] bg-[#1d1b1c] p-4">
          <h2 className="text-sm font-medium text-[#f0ece6]">Your spaces</h2>
          <p className="mt-1 text-xs leading-5 text-[#8e8a89]">
            Removing a Space keeps its saved items in your Library, without a Space.
          </p>
          <form className="mt-3 flex gap-2" onSubmit={handleCreateSpace}>
            <input
              aria-label="New Space name"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#211f21] px-3 py-2.5 text-sm text-[#f4f0e9] outline-none placeholder:text-[#777376] focus:border-[#9fb5e3]/60"
              onChange={(event) => setNewSpaceName(event.target.value)}
              placeholder="e.g. Outfit Inspo"
              value={newSpaceName}
            />
            <button
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#9fb5e3] px-3 text-xs font-medium text-[#111318] hover:bg-[#b4c6e9]"
              type="submit"
            >
              <Plus size={14} />
              Create
            </button>
          </form>
          {spaces.length > 0 ? (
            <ul className="mt-3 divide-y divide-white/[0.06]">
              {spaces.map((space) => (
                <li
                  className="flex min-h-12 items-center gap-3 py-2"
                  key={space.id}
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-[#d9d4d0]">
                    {space.name}
                  </span>
                  {spaceToDelete === space.id ? (
                    <>
                      <span className="text-xs text-[#c98e89]">Remove?</span>
                      <button
                        className="text-xs text-[#aaa7a4] hover:text-white"
                        onClick={() => setSpaceToDelete(null)}
                        type="button"
                      >
                        Keep
                      </button>
                      <button
                        className="text-xs text-[#c98e89] hover:text-white"
                        onClick={() => {
                          deleteSpace(space.id);
                          if (spaceFilter === space.id) setSpaceFilter("all");
                          setSpaceToDelete(null);
                        }}
                        type="button"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <button
                      aria-label={`Delete ${space.name} space`}
                      className="grid size-9 place-items-center rounded-full text-[#c98e89] hover:bg-white/[0.06]"
                      onClick={() => setSpaceToDelete(space.id)}
                      type="button"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-[#8e8a89]">
              No spaces yet. Create one above or when saving an item.
            </p>
          )}
        </section>
      )}

      <div className="mt-6 space-y-3">
        {!hydrated ? (
          <p className="py-8 text-sm text-[#8e8a89]">Loading your library...</p>
        ) : filteredItems.length ? (
          filteredItems.map((item) => <SavedItemCard item={item} key={item.id} />)
        ) : (
          <EmptyCollection
            description={
              items.length
                ? "Try another type or Space filter."
                : "Your saved items will appear here. Start with a thought in the box below."
            }
            icon={Archive}
            title={items.length ? "No matches" : "Your library is ready"}
          />
        )}
      </div>
    </div>
  );
}

export function RemindersView() {
  const { items, hydrated } = useOrganizerStore();
  const reminders = items
    .filter((item) => item.type === "reminder")
    .sort((a, b) => (a.dueAt ?? a.createdAt).localeCompare(b.dueAt ?? b.createdAt));
  const upcoming = reminders.filter((item) => !item.done);
  const completed = reminders.filter((item) => item.done);

  return (
    <div>
      <p className="text-sm text-[#9e9997]">Dates and things to come back to</p>
      <h1 className="serif-heading mt-2 text-4xl text-[#f4f0e9] sm:text-5xl">
        Reminders
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-6 text-[#a39e9b]">
        Dates detected from your text are shown here. You can mark an item done whenever you&apos;re ready.
      </p>

      {!hydrated ? (
        <p className="mt-8 text-sm text-[#8e8a89]">Loading reminders...</p>
      ) : reminders.length ? (
        <div className="mt-7 space-y-7">
          <section>
            <h2 className="mb-3 text-sm font-medium text-[#d9d4d0]">
              Coming up <span className="text-[#8e8a89]">{upcoming.length}</span>
            </h2>
            <div className="space-y-3">
              {upcoming.length ? (
                upcoming.map((item) => (
                  <SavedItemCard item={item} key={item.id} />
                ))
              ) : (
                <p className="rounded-2xl bg-[#1d1b1c] p-4 text-sm text-[#8e8a89]">
                  You&apos;re all caught up.
                </p>
              )}
            </div>
          </section>
          {completed.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-[#8e8a89]">
                Done {completed.length}
              </h2>
              <div className="space-y-3">
                {completed.map((item) => (
                  <SavedItemCard item={item} key={item.id} />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyCollection
            description="Try “Remind me tomorrow to call home” or tap the Reminder template below."
            icon={CalendarDays}
            title="Nothing scheduled yet"
          />
        </div>
      )}
    </div>
  );
}

export function ExpensesView() {
  const { items, tags, hydrated } = useOrganizerStore();
  const [tagFilter, setTagFilter] = useState("all");
  const expenses = items
    .filter((item) => item.type === "expense")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const filteredExpenses =
    tagFilter === "all"
      ? expenses
      : expenses.filter((item) => item.tags?.includes(tagFilter));
  return (
    <div>
      <p className="text-sm text-[#9e9997]">Income and spending, together</p>
      <h1 className="serif-heading mt-2 text-4xl text-[#f4f0e9] sm:text-5xl">
        Money
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-6 text-[#a39e9b]">
        Amounts and income or expense type are detected from your text when they&apos;re clear. Your original text is kept with every transaction.
      </p>

      <section className="mt-7 rounded-[24px] border border-white/[0.08] bg-[#1d1b1c] p-5">
        <Suspense
          fallback={<p className="text-sm text-[#8e8a89]">Loading monthly total...</p>}
        >
          <MonthlyExpenseSummary expenses={expenses} />
        </Suspense>
      </section>

      <section className="mt-7">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-[#d9d4d0]">Recent activity</h2>
          {tags.length > 0 && (
            <div className="w-full max-w-[13rem]">
              <Picker
                label="Filter by tag"
                onChange={setTagFilter}
                options={[
                  { value: "all", label: "All tags" },
                  ...tags.map((tag) => ({ value: tag, label: tag })),
                ]}
                value={tagFilter}
              />
            </div>
          )}
        </div>
        {!hydrated ? (
          <p className="text-sm text-[#8e8a89]">Loading expenses...</p>
        ) : filteredExpenses.length ? (
          <div className="space-y-3">
            {filteredExpenses.map((item) => (
              <SavedItemCard item={item} key={item.id} />
            ))}
          </div>
        ) : (
          <EmptyCollection
            description={
              expenses.length
                ? "No transactions use this tag yet."
                : "Try “Paid ₹250 for lunch” or “Salary ₹50,000” to log spending or income."
            }
            icon={ReceiptText}
            title={expenses.length ? "No tagged transactions" : "No transactions yet"}
          />
        )}
      </section>
    </div>
  );
}

function MonthlyExpenseSummary({ expenses }: { expenses: OrganizerItem[] }) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthExpenses = expenses.filter((item) =>
    item.createdAt.startsWith(currentMonth),
  );
  const currencyTotals = monthExpenses.reduce<
    Record<string, { income: number; expense: number }>
  >((totals, item) => {
    const key = item.currency ?? "";
    if (item.amount !== undefined) {
      totals[key] ??= { income: 0, expense: 0 };
      totals[key][item.transactionKind === "income" ? "income" : "expense"] +=
        item.amount;
    }
    return totals;
  }, {});

  return (
    <>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8e8a89]">
        This month
      </p>
      {Object.keys(currencyTotals).length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.entries(currencyTotals).map(([currency, totals]) => (
            <div className="rounded-2xl bg-[#171617] p-4" key={currency || "unspecified"}>
              <p className="text-xs text-[#8e8a89]">
                {currency || "Unspecified currency"}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div>
                  <p className="text-xs text-[#9ebc99]">Income</p>
                  <p className="mt-1 break-words text-sm font-medium text-[#d5e5d0] sm:text-base">
                    {formatMoney(totals.income, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#9fb5e3]">Expense</p>
                  <p className="mt-1 break-words text-sm font-medium text-[#d2ddf2] sm:text-base">
                    {formatMoney(totals.expense, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#c5d5f3]">Balance</p>
                  <p
                    className={`mt-1 break-words text-sm font-medium sm:text-base ${
                      totals.income - totals.expense < 0
                        ? "text-[#e2a39b]"
                        : "text-[#f1ede7]"
                    }`}
                  >
                    {formatMoney(totals.income - totals.expense, currency)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="serif-heading mt-2 text-3xl text-[#f1ede7]">
          No transactions yet
        </p>
      )}
      <p className="mt-2 text-xs text-[#8e8a89]">
        {monthExpenses.length} {monthExpenses.length === 1 ? "transaction" : "transactions"} recorded
      </p>
    </>
  );
}
