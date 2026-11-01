"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowUpRight,
  Archive,
  CalendarDays,
  ChefHat,
  Check,
  Clock3,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  Save,
  Search,
  ShoppingBasket,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  createCaptureDraft,
  getExpenseTotals,
  itemTypes,
  normalizeExpenseCurrency,
  type ItemType,
  type OrganizerItem,
  type OrganizerSpace,
  type TransactionKind,
  type ExpenseDraft,
  typeLabels,
} from "@/lib/organizer";
import { useOrganizerStore } from "@/components/organizer-store";
import { Picker } from "@/components/picker";
import { ReminderDateTimePicker } from "@/components/reminder-date-time-picker";
import { TagPicker } from "@/components/tag-picker";
import { IdeaImage } from "@/components/idea-image";
import { BackupControls } from "@/components/backup-controls";
import {
  compressIdeaImage,
  deleteIdeaImage,
  saveIdeaImage,
} from "@/lib/idea-images";

function formatDay(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatReminderDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

const libraryTypes = itemTypes.filter((type) => type !== "expense");

function searchableItemText(item: OrganizerItem) {
  return [
    item.title,
    item.body,
    item.rawText,
    item.link,
    ...(item.tags ?? []),
    ...(item.entries?.map((entry) => entry.text) ?? []),
    ...(item.ingredients ?? []),
    ...(item.steps ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
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

function getExpenseLines(item: OrganizerItem): ExpenseDraft[] {
  if (item.expenses) return item.expenses.map(normalizeExpenseCurrency);
  if (item.amount !== undefined || item.currency || item.transactionKind) {
    return [
      normalizeExpenseCurrency({
        id: item.id,
        title: item.title,
        amount: item.amount ?? null,
        currency: item.currency ?? "₹",
        transactionKind: item.transactionKind ?? "expense",
        tags: item.tags ?? [],
      }),
    ];
  }
  return [];
}

function getExpenseLineTotals(item: OrganizerItem) {
  return getExpenseTotals(getExpenseLines(item));
}

function ItemTypeBadge({
  type,
  transactionKind,
}: {
  type: ItemType;
  transactionKind?: TransactionKind | "mixed";
}) {
  const icons: Record<ItemType, typeof Archive> = {
    reminder: CalendarDays,
    expense: ReceiptText,
    list: ShoppingBasket,
    recipe: ChefHat,
    idea: Sparkles,
    note: Archive,
  };
  const Icon = icons[type];

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-[#aaa7a4]">
      <Icon size={13} />
      {type === "expense"
        ? transactionKind === "income"
          ? "Income"
          : transactionKind === "mixed"
            ? "Transactions"
            : "Expense"
        : typeLabels[type]}
    </span>
  );
}

function SavedItemCard({
  item,
  openForReschedule = false,
}: {
  item: OrganizerItem;
  openForReschedule?: boolean;
}) {
  const { spaces, tags, ideaTags, deleteItem, updateItem } = useOrganizerStore();
  const router = useRouter();
  const space = spaces.find((entry) => entry.id === item.spaceId);
  const [editing, setEditing] = useState(openForReschedule);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showAllContent, setShowAllContent] = useState(false);
  const [editType, setEditType] = useState(item.type);
  const [editSpaceId, setEditSpaceId] = useState(item.spaceId ?? "none");
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body ?? item.rawText);
  const [entries, setEntries] = useState(item.entries ?? []);
  const [expenseLines, setExpenseLines] = useState(() => getExpenseLines(item));
  const [ingredients, setIngredients] = useState(item.ingredients ?? []);
  const [steps, setSteps] = useState(item.steps ?? []);
  const [link, setLink] = useState(item.link ?? "");
  const [imageId, setImageId] = useState(item.imageId);
  const [imageFile, setImageFile] = useState<File>();
  const [newEntry, setNewEntry] = useState("");
  const [dueAt, setDueAt] = useState(item.dueAt);
  const [editTags, setEditTags] = useState(item.tags ?? []);
  const [editError, setEditError] = useState("");
  const displayExpenseLines = getExpenseLines(item);
  const expenseTotals = getExpenseLineTotals(item);
  const transactionKinds = new Set(
    displayExpenseLines.map((line) => line.transactionKind),
  );
  const badgeTransactionKind: TransactionKind | "mixed" | undefined =
    transactionKinds.size > 1
      ? "mixed"
      : transactionKinds.values().next().value ?? item.transactionKind;

  function startEditing() {
    setEditType(item.type);
    setEditSpaceId(item.spaceId ?? "none");
    setTitle(item.title);
    setBody(item.body ?? item.rawText);
    setEntries(item.entries ?? []);
    setExpenseLines(getExpenseLines(item));
    setIngredients(item.ingredients ?? []);
    setSteps(item.steps ?? []);
    setLink(item.link ?? "");
    setImageId(item.imageId);
    setImageFile(undefined);
    setNewEntry("");
    setDueAt(item.dueAt);
    setEditTags(item.tags ?? []);
    setEditError("");
    setEditing(true);
    setConfirmDelete(false);
  }

  function changeType(type: ItemType) {
    const draft = createCaptureDraft(type, item.rawText, item.dueAt);
    setEditType(type);
    setTitle(draft.title);
    setBody(draft.body ?? item.rawText);
    setEntries((draft.entries ?? []).map((text) => ({ text, done: false })));
    setExpenseLines(draft.expenses ?? []);
    setIngredients(draft.ingredients ?? []);
    setSteps(draft.steps ?? []);
    setLink(draft.link ?? "");
    setEditTags(draft.tags ?? []);
    if (draft.type === "reminder") setDueAt(draft.dueAt);
  }

  async function saveEdits() {
    if (!title.trim()) {
      setEditError("Add a title before saving.");
      return;
    }
    if (editType === "list" && entries.every((entry) => !entry.text.trim())) {
      setEditError("Add at least one list item.");
      return;
    }
    if (editType === "recipe" && (!ingredients.length || !steps.length)) {
      setEditError("Add at least one ingredient and one process step.");
      return;
    }
    if (
      editType === "expense" &&
      (!expenseLines.length || expenseLines.some((expense) => !expense.title.trim()))
    ) {
      setEditError("Keep at least one named transaction in this capture.");
      return;
    }
    if (
      editType === "idea" &&
      link.trim() &&
      !/^https?:\/\//i.test(link.trim())
    ) {
      setEditError("Use a link that starts with http:// or https://.");
      return;
    }

    const previousImageId = item.imageId;
    let savedImageId = editType === "idea" ? imageId : undefined;
    try {
      if (imageFile) {
        savedImageId = crypto.randomUUID();
        await saveIdeaImage(savedImageId, await compressIdeaImage(imageFile));
      }
    } catch (cause) {
      console.error("Could not update this idea image.", cause);
      setEditError("The image could not be updated on this device.");
      return;
    }

    const updated = updateItem(item.id, {
      type: editType,
      title: title.trim(),
      body: editType === "note" || editType === "idea" ? body : undefined,
      entries:
        editType === "list"
          ? entries.filter((entry) => entry.text.trim())
          : undefined,
      expenses:
        editType === "expense"
          ? expenseLines.map((expense) => normalizeExpenseCurrency({
              ...expense,
              title: expense.title.trim(),
              id: expense.id ?? crypto.randomUUID(),
              tags: expense.tags ?? [],
            }))
          : undefined,
      ingredients: editType === "recipe" ? ingredients : undefined,
      steps: editType === "recipe" ? steps : undefined,
      link: editType === "idea" ? link.trim() || undefined : undefined,
      imageId: savedImageId,
      dueAt: editType === "reminder" ? dueAt : undefined,
      spaceId:
        editType !== "expense" && editSpaceId !== "none"
          ? editSpaceId
          : undefined,
      tags: editType === "idea" ? editTags : undefined,
    });
    if (!updated) {
      if (imageFile && savedImageId) {
        try {
          await deleteIdeaImage(savedImageId);
        } catch (cause) {
          console.error("Could not clean up an unsaved idea image.", cause);
        }
      }
      setEditError("These changes were not saved. Check the storage message and try again.");
      return;
    }
    if (previousImageId && previousImageId !== savedImageId) {
      try {
        await deleteIdeaImage(previousImageId);
      } catch (cause) {
        console.error("Could not remove the previous idea image.", cause);
        setEditError("The item was saved, but its previous image could not be removed.");
      }
    }
    setEditing(false);
    if (openForReschedule) router.replace("/reminders/");
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
          <ItemTypeBadge
            type={item.type}
            transactionKind={badgeTransactionKind}
          />
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
                  if (editing) {
                    setEditing(false);
                    if (openForReschedule) router.replace("/reminders/");
                  } else {
                    startEditing();
                  }
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
          {formatReminderDate(item.dueAt)}
          <span className="text-[#858181]">at</span>
          {new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            minute: "2-digit",
          }).format(new Date(item.dueAt))}
        </div>
      )}

      {item.type === "expense" && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {expenseTotals.expense > 0 && (
              <span className="text-[#c4d2ec]">
                Spent {formatMoney(expenseTotals.expense, "₹")}
              </span>
            )}
            {expenseTotals.income > 0 && (
              <span className="text-[#b8d5b3]">
                Income {formatMoney(expenseTotals.income, "₹")}
              </span>
            )}
            <span className="text-[#8e8a89]">
              {displayExpenseLines.length}{" "}
              {displayExpenseLines.length === 1 ? "transaction" : "transactions"}
            </span>
          </div>
          <ul className="divide-y divide-white/[0.06] rounded-xl bg-[#171617] px-3">
            {displayExpenseLines.map((line, index) => (
              <li className="flex items-start gap-3 py-2" key={line.id ?? index}>
                <span
                  className={`min-w-0 flex-1 text-sm ${
                    line.transactionKind === "income"
                      ? "text-[#cfe0c8]"
                      : "text-[#dedbd8]"
                  }`}
                >
                  {line.title}
                  {line.tags?.length ? (
                    <span className="ml-2 inline-flex flex-wrap gap-1">
                      {line.tags.map((tag) => (
                        <span
                          className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-[#aaa7a4]"
                          key={tag}
                        >
                          {tag}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>
                <span
                  className={`shrink-0 text-sm font-medium ${
                    line.transactionKind === "income"
                      ? "text-[#b8d5b3]"
                      : "text-[#c4d2ec]"
                  }`}
                >
                  {line.transactionKind === "income" ? "+" : "−"}
                  {formatMoney(line.amount ?? undefined, line.currency)}
                </span>
              </li>
            ))}
          </ul>
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

      {(item.type === "note" || item.type === "idea") && (
        <>
          <p
            className={`mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#b8b4b1] ${
              showAllContent ? "" : "line-clamp-3"
            }`}
          >
            {item.body ?? item.rawText}
          </p>
          {item.type === "idea" && (
            <>
              {item.tags?.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      className="rounded-full bg-[#35496d]/40 px-2.5 py-1 text-[10px] text-[#c5d5f3]"
                      key={tag}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {item.link && /^https?:\/\//i.test(item.link) && (
                <a
                  className="mt-2 inline-flex max-w-full items-center gap-1.5 truncate text-xs text-[#9fb5e3] hover:text-white"
                  href={item.link}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink size={13} className="shrink-0" />
                  <span className="truncate">{item.link}</span>
                </a>
              )}
              <IdeaImage imageId={item.imageId} />
            </>
          )}
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

      {item.type === "recipe" && (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wide text-[#9fb5e3]">
              Ingredients
            </h3>
            <ul className="mt-2 space-y-1.5">
              {(item.ingredients ?? []).map((ingredient, index) => (
                <li
                  className="flex gap-2 text-sm leading-5 text-[#d9d4d0]"
                  key={`${item.id}-ingredient-${index}`}
                >
                  <span className="text-[#9fb5e3]">•</span>
                  <span>{ingredient}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wide text-[#9fb5e3]">
              Steps
            </h3>
            <ol className="mt-2 space-y-2">
              {(item.steps ?? []).map((step, index) => (
                <li
                  className="flex gap-2 text-sm leading-5 text-[#d9d4d0]"
                  key={`${item.id}-step-${index}`}
                >
                  <span className="text-xs font-medium text-[#9fb5e3]">
                    {index + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
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
            onClick={async () => {
              try {
                await deleteItem(item.id);
              } catch (cause) {
                console.error("Could not delete this saved item.", cause);
                setEditError("The item could not be deleted. Try again.");
              }
            }}
            type="button"
          >
            Delete item
          </button>
        </div>
      )}
      {editError && !editing && (
        <p className="mt-2 text-xs text-[#f19a91]" role="alert">
          {editError}
        </p>
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

          {(editType === "note" || editType === "idea") && (
            <label className="block space-y-1.5 text-xs text-[#aaa6a4]">
              Content
              <textarea
                className="min-h-28 w-full resize-y rounded-xl border border-white/10 bg-[#211f21] px-3 py-2.5 text-sm leading-6 text-[#f4f0e9] outline-none focus:border-[#9fb5e3]/60"
                onChange={(event) => setBody(event.target.value)}
                value={body}
              />
            </label>
          )}

          {editType === "idea" && (
            <div className="space-y-4">
              <label className="block space-y-1.5 text-xs text-[#aaa6a4]">
                Link (optional)
                <input
                  className="w-full rounded-xl border border-white/10 bg-[#211f21] px-3 py-2.5 text-sm text-[#f4f0e9] outline-none focus:border-[#9fb5e3]/60"
                  onChange={(event) => setLink(event.target.value)}
                  type="url"
                  value={link}
                />
              </label>
              <TagPicker
                availableTags={ideaTags}
                onChange={setEditTags}
                value={editTags}
              />
              <IdeaImage imageId={imageId} />
              <label className="block text-xs text-[#aaa6a4]">
                {imageId ? "Replace image" : "Add an image"}
                <input
                  accept="image/*"
                  className="mt-1.5 block w-full text-sm text-[#b8b4b1] file:mr-3 file:rounded-full file:border-0 file:bg-[#35496d] file:px-3 file:py-2 file:text-xs file:text-[#e2eafb]"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith("image/")) {
                      setEditError("Choose an image file.");
                      event.target.value = "";
                      return;
                    }
                    if (file.size > 15 * 1024 * 1024) {
                      setEditError("Choose an image smaller than 15 MB.");
                      event.target.value = "";
                      return;
                    }
                    setEditError("");
                    setImageFile(file);
                  }}
                  type="file"
                />
              </label>
              {imageFile && (
                <p className="text-xs text-[#aaa6a4]">
                  New image: {imageFile.name}
                </p>
              )}
              {imageId && (
                <button
                  className="text-xs text-[#c98e89] hover:text-white"
                  onClick={() => {
                    setImageId(undefined);
                    setImageFile(undefined);
                  }}
                  type="button"
                >
                  Remove image
                </button>
              )}
            </div>
          )}

          {editType === "recipe" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 text-xs text-[#aaa6a4]">
                Ingredients (one per line)
                <textarea
                  className="min-h-28 w-full rounded-xl border border-white/10 bg-[#211f21] px-3 py-2.5 text-sm leading-6 text-[#f4f0e9] outline-none focus:border-[#9fb5e3]/60"
                  onChange={(event) =>
                    setIngredients(
                      event.target.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
                    )
                  }
                  value={ingredients.join("\n")}
                />
              </label>
              <label className="block space-y-1.5 text-xs text-[#aaa6a4]">
                Steps (one per line)
                <textarea
                  className="min-h-28 w-full rounded-xl border border-white/10 bg-[#211f21] px-3 py-2.5 text-sm leading-6 text-[#f4f0e9] outline-none focus:border-[#9fb5e3]/60"
                  onChange={(event) =>
                    setSteps(
                      event.target.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
                    )
                  }
                  value={steps.join("\n")}
                />
              </label>
            </div>
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
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#211f21] px-3 py-2.5 text-sm text-[#f4f0e9] outline-none placeholder:text-[#969190] focus:border-[#9fb5e3]/60"
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
            <div className="space-y-1.5">
              <p className="text-xs text-[#aaa6a4]">Reminder date and time</p>
              <ReminderDateTimePicker onChange={setDueAt} value={dueAt} />
            </div>
          )}

          {editType === "expense" && (
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-[#aaa6a4]">Transactions in this capture</h3>
              {expenseLines.map((line, index) => (
                <div
                  className="space-y-3 rounded-xl border border-white/[0.08] bg-[#211f21] p-3"
                  key={line.id ?? index}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
                    <label className="block space-y-1.5 text-xs text-[#aaa6a4]">
                      Name
                      <input
                        className="w-full rounded-xl border border-white/10 bg-[#171617] px-3 py-2.5 text-sm text-[#f4f0e9] outline-none focus:border-[#9fb5e3]/60"
                        onChange={(event) =>
                          setExpenseLines((current) =>
                            current.map((entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, title: event.target.value }
                                : entry,
                            ),
                          )
                        }
                        value={line.title}
                      />
                    </label>
                    <label className="block space-y-1.5 text-xs text-[#aaa6a4]">
                      Amount
                      <input
                        className="w-full rounded-xl border border-white/10 bg-[#171617] px-3 py-2.5 text-sm text-[#f4f0e9] outline-none focus:border-[#9fb5e3]/60"
                        inputMode="decimal"
                        min="0"
                        onChange={(event) =>
                          setExpenseLines((current) =>
                            current.map((entry, entryIndex) =>
                              entryIndex === index
                                ? {
                                    ...entry,
                                    amount: event.target.value
                                      ? Number(event.target.value)
                                      : null,
                                  }
                                : entry,
                            ),
                          )
                        }
                        step="0.01"
                        type="number"
                        value={line.amount ?? ""}
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
                    <div className="space-y-1.5">
                      <p className="text-xs text-[#aaa6a4]">Kind</p>
                      <Picker
                        label={`Transaction ${index + 1} kind`}
                        onChange={(value) => {
                          if (value !== "expense" && value !== "income") return;
                          setExpenseLines((current) =>
                            current.map((entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, transactionKind: value }
                                : entry,
                            ),
                          );
                        }}
                        options={[
                          { value: "expense", label: "Expense" },
                          { value: "income", label: "Income" },
                        ]}
                        value={line.transactionKind}
                      />
                    </div>
                    <div className="space-y-1.5 text-xs text-[#aaa6a4]">
                      <p>Currency</p>
                      <p className="rounded-xl border border-white/10 bg-[#171617] px-3 py-2.5 text-sm text-[#f4f0e9]">
                        ₹ INR
                      </p>
                    </div>
                  </div>
                  <TagPicker
                    availableTags={tags}
                    onChange={(selected) =>
                      setExpenseLines((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index
                            ? { ...entry, tags: selected }
                            : entry,
                        ),
                      )
                    }
                    value={line.tags ?? []}
                  />
                  <button
                    className="text-xs text-[#c98e89] hover:text-white"
                    onClick={() =>
                      setExpenseLines((current) =>
                        current.filter((_, entryIndex) => entryIndex !== index),
                      )
                    }
                    type="button"
                  >
                    Remove transaction
                  </button>
                </div>
              ))}
              <button
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 px-3 text-xs text-[#d9d4d0] hover:border-white/25"
                onClick={() =>
                  setExpenseLines((current) => [
                    ...current,
                    {
                      id: crypto.randomUUID(),
                      title: "",
                      amount: null,
                      currency: "₹",
                      transactionKind: "expense",
                      tags: [],
                    },
                  ])
                }
                type="button"
              >
                <Plus size={14} />
                Add transaction
              </button>
            </div>
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

function SpaceCard({
  href,
  name,
  count,
  latestItem,
  layout = "scroll",
  onClick,
}: {
  href: string;
  name: string;
  count: number;
  latestItem?: OrganizerItem;
  layout?: "grid" | "scroll";
  onClick?: () => void;
}) {
  return (
    <Link
      className={`flex aspect-square flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#1d1b1c] p-4 transition hover:border-[#9fb5e3]/40 hover:bg-[#211f21] ${
        layout === "grid"
          ? "w-full"
          : "w-36 shrink-0 snap-start sm:w-40"
      }`}
      href={href}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <Archive className="text-[#9fb5e3]" size={20} />
        <ArrowUpRight className="text-[#9fb5e3]" size={17} />
      </div>
      <div className="min-w-0">
        <h3 className="serif-heading truncate text-xl text-[#f3efe9]">{name}</h3>
        <p className="mt-1 text-xs text-[#8e8a89]">
          {count} {count === 1 ? "item" : "items"}
        </p>
        <p className="mt-1 truncate text-[11px] text-[#8e8a89]">
          {latestItem ? `Updated ${formatDay(latestItem.createdAt)}` : "No items yet"}
        </p>
      </div>
    </Link>
  );
}

export function HomeView() {
  const { items, spaces, hydrated } = useOrganizerStore();
  const reminders = items
    .filter((item) => item.type === "reminder" && !item.done)
    .sort((a, b) => (a.dueAt ?? a.createdAt).localeCompare(b.dueAt ?? b.createdAt))
    .slice(0, 3);
  const recentSpaces = spaces
    .map((space) => {
      const spaceItems = items.filter((item) => item.spaceId === space.id);
      const latestItem = spaceItems.reduce<OrganizerItem | undefined>(
        (latest, item) =>
          !latest || item.createdAt > latest.createdAt ? item : latest,
        undefined,
      );
      return { space, count: spaceItems.length, latestItem };
    })
    .sort((left, right) =>
      (right.latestItem?.createdAt ?? "").localeCompare(
        left.latestItem?.createdAt ?? "",
      ),
    );

  return (
    <div className="flex flex-col gap-7">
      <section className="order-0">
        <Suspense fallback={<p className="h-5 text-sm text-[#9e9997]">Today</p>}>
          <CurrentDate />
        </Suspense>
        <h1 className="serif-heading mt-2 max-w-2xl text-[2.4rem] leading-[1.08] tracking-tight text-[#f4f0e9] sm:text-5xl">
          Keep the little things close.
        </h1>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="serif-heading text-2xl text-[#f0ece6]">Spaces</h2>
          <Link
            className="inline-flex items-center gap-1 text-sm text-[#a9bddf] hover:text-white"
            href="/library"
          >
            Manage <ArrowUpRight size={15} />
          </Link>
        </div>
        {!hydrated ? (
          <p className="py-4 text-sm text-[#8e8a89]">Loading your Spaces...</p>
        ) : recentSpaces.length ? (
          <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
            {recentSpaces.map(({ space, count, latestItem }) => (
              <SpaceCard
                href={`/library?space=${encodeURIComponent(space.id)}`}
                key={space.id}
                name={space.name}
                count={count}
                latestItem={latestItem}
              />
            ))}
          </div>
        ) : (
          <EmptyCollection
            description="Create a Space such as Recipes or Outfit Inspo in Library, then save content into it."
            icon={Archive}
            title="No Spaces yet"
          />
        )}
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

    </div>
  );
}

export function LibraryView() {
  const {
    items,
    spaces,
    hydrated,
    createSpace,
    deleteSpace,
  } =
    useOrganizerStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeTypeFilter = searchParams.get("type");
  const typeFilter =
    libraryTypes.find((type) => type === routeTypeFilter) ?? "all";
  const selectedSpaceId = searchParams.get("space");
  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId);
  const isUnfiled = selectedSpaceId === "unfiled";
  const showingContents = Boolean(selectedSpace || isUnfiled);
  const [query, setQuery] = useState("");
  const [manageSpaces, setManageSpaces] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [spaceToDelete, setSpaceToDelete] = useState<string | null>(null);

  const libraryItems = useMemo(
    () => items.filter((item) => item.type !== "expense"),
    [items],
  );
  const searchResults = useMemo(
    () =>
      !showingContents && query.trim()
        ? libraryItems.filter(
            (item) =>
              (typeFilter === "all" || item.type === typeFilter) &&
              searchableItemText(item).includes(query.trim().toLocaleLowerCase()),
          )
        : [],
    [libraryItems, query, showingContents, typeFilter],
  );
  const filteredItems = useMemo(
    () =>
      libraryItems.filter(
        (item) =>
          (typeFilter === "all" || item.type === typeFilter) &&
          (selectedSpace
            ? item.spaceId === selectedSpace.id
            : isUnfiled
              ? !item.spaceId
              : false) &&
          searchableItemText(item).includes(query.trim().toLocaleLowerCase()),
      ),
    [isUnfiled, libraryItems, query, selectedSpace, typeFilter],
  );
  const visibleSpaces = useMemo(
    () =>
      spaces
        .map((space) => {
          const matchingItems = libraryItems.filter(
            (item) =>
              item.spaceId === space.id &&
              (typeFilter === "all" || item.type === typeFilter),
          );
          const latestItem = matchingItems.reduce<OrganizerItem | undefined>(
            (latest, item) =>
              !latest || item.createdAt > latest.createdAt ? item : latest,
            undefined,
          );
          return { space, count: matchingItems.length, latestItem };
        })
        .filter(
          ({ space, count }) =>
            (typeFilter === "all" || count > 0) &&
            space.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
        )
        .sort((left, right) =>
          (right.latestItem?.createdAt ?? "").localeCompare(
            left.latestItem?.createdAt ?? "",
          ),
        ),
    [libraryItems, query, spaces, typeFilter],
  );
  const unfiledItems = libraryItems.filter(
    (item) =>
      !item.spaceId && (typeFilter === "all" || item.type === typeFilter),
  );
  const latestUnfiledItem = unfiledItems.reduce<OrganizerItem | undefined>(
    (latest, item) =>
      !latest || item.createdAt > latest.createdAt ? item : latest,
    undefined,
  );
  const showUnfiledCard =
    unfiledItems.length > 0 &&
    "unfiled".includes(query.trim().toLocaleLowerCase());

  useEffect(() => {
    if (!hydrated || !showingContents || !window.location.hash) return;
    const itemId = window.location.hash.slice(1);
    window.requestAnimationFrame(() => {
      document.getElementById(itemId)?.scrollIntoView({ block: "start" });
    });
  }, [hydrated, selectedSpaceId, showingContents, typeFilter]);

  useEffect(() => {
    if (routeTypeFilter === "expense") router.replace("/expenses");
  }, [routeTypeFilter, router]);

  function handleCreateSpace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newSpaceName.trim()) return;
    if (createSpace(newSpaceName)) setNewSpaceName("");
  }

  return (
    <div>
      {showingContents && (
        <Link
          className="mb-6 inline-flex items-center gap-2 text-sm text-[#a9bddf] hover:text-white"
          href="/library"
          onClick={() => setQuery("")}
        >
          <ArrowUpRight className="rotate-[-135deg]" size={15} />
          All spaces
        </Link>
      )}
      <h1 className="serif-heading mt-2 text-4xl text-[#f4f0e9] sm:text-5xl">
        {selectedSpace?.name ?? (isUnfiled ? "Unfiled" : "Library")}
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-6 text-[#a39e9b]">
        {showingContents
          ? "Browse and search the items in this Space."
          : "Choose a Space to browse the things you want to keep."}
      </p>

      <label className="relative mt-6 block">
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#898487]"
          size={17}
        />
        <input
          aria-label={
            showingContents
              ? `Search ${selectedSpace?.name ?? "unfiled items"}`
              : "Search Spaces and saved items"
          }
          className="min-h-11 w-full rounded-xl border border-white/10 bg-[#211f21] pl-10 pr-4 text-sm text-[#f4f0e9] outline-none placeholder:text-[#969190] focus:border-[#9fb5e3]/60"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            showingContents
              ? "Search titles and content"
              : "Search Spaces and saved items"
          }
          type="search"
          value={query}
        />
      </label>

      {showingContents && (
        <>
          <div className="mt-7 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(["all", ...libraryTypes] as const).map((type) => (
              <button
                aria-pressed={typeFilter === type}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-xs transition ${
                  typeFilter === type
                    ? "border-[#9fb5e3] bg-[#35496d] text-white"
                    : "border-white/10 text-[#aaa7a4] hover:border-white/25"
                }`}
                key={type}
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (type === "all") {
                    params.delete("type");
                  } else {
                    params.set("type", type);
                  }
                  const queryString = params.toString();
                  router.replace(
                    queryString ? `/library?${queryString}` : "/library",
                    { scroll: false },
                  );
                }}
                type="button"
              >
                {type === "all" ? "Everything" : typeLabels[type]}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-6 flex items-center justify-end">
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
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#211f21] px-3 py-2.5 text-sm text-[#f4f0e9] outline-none placeholder:text-[#969190] focus:border-[#9fb5e3]/60"
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
                          if (deleteSpace(space.id)) setSpaceToDelete(null);
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
          <BackupControls />
        </section>
      )}

      {!showingContents ? (
        <section className="mt-6">
          {!hydrated ? (
            <p className="py-8 text-sm text-[#8e8a89]">Loading your Spaces...</p>
          ) : visibleSpaces.length || showUnfiledCard ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visibleSpaces.map(({ space, count, latestItem }) => (
                <SpaceCard
                  href={`/library?space=${encodeURIComponent(space.id)}${typeFilter === "all" ? "" : `&type=${typeFilter}`}`}
                  key={space.id}
                  name={space.name}
                  count={count}
                  latestItem={latestItem}
                  layout="grid"
                  onClick={() => setQuery("")}
                />
              ))}
              {showUnfiledCard && (
                <SpaceCard
                  href={`/library?space=unfiled${typeFilter === "all" ? "" : `&type=${typeFilter}`}`}
                  name="Unfiled"
                  count={unfiledItems.length}
                  latestItem={latestUnfiledItem}
                  layout="grid"
                  onClick={() => setQuery("")}
                />
              )}
            </div>
          ) : searchResults.length ? null : (
            <EmptyCollection
              description={
                spaces.length
                  ? `No Spaces contain ${
                      typeFilter === "all"
                        ? "items"
                        : `${typeLabels[typeFilter].toLowerCase()} items`
                    }.`
                  : "Create a Space here, or save an item into a new Space."
              }
              icon={Archive}
              title={query ? "No Spaces or items found" : "No Spaces yet"}
            />
          )}
        </section>
      ) : (
        <div className="mt-6 space-y-3">
          {!hydrated ? (
            <p className="py-8 text-sm text-[#8e8a89]">Loading items...</p>
          ) : filteredItems.length ? (
            filteredItems.map((item) => <SavedItemCard item={item} key={item.id} />)
          ) : (
            <EmptyCollection
              description={
                query
                  ? "Try another title or search term."
                  : "Items saved to this Space will appear here."
              }
              icon={Archive}
              title={query ? "No matches" : "This Space is empty"}
            />
          )}
        </div>
      )}
    {!showingContents && searchResults.length > 0 && (
      <section className="mt-7 space-y-3">
        <h2 className="text-sm font-medium text-[#d9d4d0]">
          Matching items ({searchResults.length})
        </h2>
        {searchResults.map((item) => (
          <SavedItemCard item={item} key={item.id} />
        ))}
      </section>
    )}
    </div>
  );
}

export function RemindersView() {
  const { items, hydrated } = useOrganizerStore();
  const searchParams = useSearchParams();
  const rescheduleId = searchParams.get("reschedule");
  const reminders = items
    .filter((item) => item.type === "reminder")
    .sort((a, b) => (a.dueAt ?? a.createdAt).localeCompare(b.dueAt ?? b.createdAt));
  const upcoming = reminders.filter((item) => !item.done);
  const completed = reminders.filter((item) => item.done);

  return (
    <div>
      <h1 className="serif-heading mt-2 text-4xl text-[#f4f0e9] sm:text-5xl">
        Reminders
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-6 text-[#a39e9b]">
        On Android, dated reminders alert at the scheduled time. Allow notifications and exact alarms when asked.
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
                  <SavedItemCard
                    item={item}
                    key={`${item.id}-${item.id === rescheduleId}`}
                    openForReschedule={item.id === rescheduleId}
                  />
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
      : expenses.filter((item) =>
          getExpenseLines(item).some((line) => line.tags?.includes(tagFilter)),
        );
  return (
    <div>
      <h1 className="serif-heading mt-2 text-4xl text-[#f4f0e9] sm:text-5xl">
        Money
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-6 text-[#a39e9b]">
        Original capture text stays with every transaction.
      </p>

      <section className="sticky top-[64px] z-[5] mt-5 rounded-[24px] border border-white/[0.08] bg-[#1d1b1c]/95 p-4 shadow-xl backdrop-blur sm:p-5">
        <MoneyBalanceSummary expenses={expenses} />
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

function MoneyBalanceSummary({ expenses }: { expenses: OrganizerItem[] }) {
  const transactionCount = expenses.reduce(
    (count, item) => count + getExpenseLines(item).length,
    0,
  );
  const totals = getExpenseTotals(expenses.flatMap(getExpenseLines));

  return (
    <>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8e8a89]">
        Income · expenses · balance
      </p>
      {transactionCount > 0 ? (
        <div className="mt-3 rounded-2xl bg-[#171617] p-3">
          <p className="text-[11px] text-[#8e8a89]">₹ INR · all time</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div>
              <p className="text-xs text-[#9ebc99]">Income</p>
              <p className="mt-1 break-words text-sm font-medium text-[#d5e5d0] sm:text-base">
                {formatMoney(totals.income, "₹")}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#9fb5e3]">Expense</p>
              <p className="mt-1 break-words text-sm font-medium text-[#d2ddf2] sm:text-base">
                {formatMoney(totals.expense, "₹")}
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
                {formatMoney(totals.income - totals.expense, "₹")}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-[#f1ede7]">
          No transactions yet
        </p>
      )}
      <p className="mt-2 text-xs text-[#8e8a89]">
        {transactionCount}{" "}
        {transactionCount === 1 ? "transaction" : "transactions"} recorded
      </p>
    </>
  );
}
