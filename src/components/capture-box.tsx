"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Check, X } from "lucide-react";
import {
  createCaptureDraft,
  defaultSpaceNames,
  detectType,
  itemTypes,
  type CaptureDraft,
  type ExpenseDraft,
  type ItemType,
  typeLabels,
} from "@/lib/organizer";
import { useOrganizerStore } from "@/components/organizer-store";
import { Picker } from "@/components/picker";
import { TagPicker } from "@/components/tag-picker";

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function CaptureBox() {
  const router = useRouter();
  const { spaces, tags, saveCapture, suggestedSpace } = useOrganizerStore();
  const [text, setText] = useState("");
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);
  const [step, setStep] = useState<"choose" | "review" | null>(null);
  const [draft, setDraft] = useState<CaptureDraft | null>(null);
  const [spaceChoice, setSpaceChoice] = useState("new");
  const [newSpaceName, setNewSpaceName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!step) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [step]);

  function openReview(type: ItemType, rawText: string, dueAt?: string) {
    const newDraft = createCaptureDraft(type, rawText, dueAt);
    setDraft(newDraft);
    const suggestion = suggestedSpace(type);
    setSpaceChoice(suggestion?.id ?? "new");
    setNewSpaceName(suggestion?.name ?? defaultSpaceNames[type]);
    setError("");
    setStep("review");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rawText = text.trim();
    if (!rawText) return;

    if (selectedType) {
      const detection = detectType(rawText);
      openReview(selectedType, rawText, selectedType === "reminder" ? detection.dueAt : undefined);
      return;
    }

    const detection = detectType(rawText);
    if (detection.uncertain || !detection.type) {
      setStep("choose");
      setError("");
      return;
    }

    openReview(detection.type, rawText, detection.dueAt);
  }

  function chooseType(type: ItemType) {
    const detection = detectType(text.trim());
    openReview(type, text.trim(), type === "reminder" ? detection.dueAt : undefined);
  }

  function closeReview() {
    setStep(null);
    setDraft(null);
    setError("");
  }

  function updateExpense(index: number, updates: Partial<ExpenseDraft>) {
    setDraft((current) => {
      if (!current?.expenses) return current;
      return {
        ...current,
        expenses: current.expenses.map((expense, expenseIndex) =>
          expenseIndex === index ? { ...expense, ...updates } : expense,
        ),
      };
    });
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;

    const chosenSpace = spaces.find((space) => space.id === spaceChoice);
    const spaceName =
      draft.type === "expense"
        ? null
        : spaceChoice === "none"
          ? null
          : chosenSpace?.name ?? newSpaceName.trim();
    if (draft.type !== "expense" && spaceChoice === "new" && !spaceName) {
      setError("Choose a Space or give your new Space a name.");
      return;
    }
    if (draft.type !== "expense" && !draft.title.trim()) {
      setError("Give this a title before saving.");
      return;
    }
    if (
      draft.type === "expense" &&
      draft.expenses?.some((expense) => !expense.title.trim())
    ) {
      setError("Give each expense a name before saving.");
      return;
    }

    const savedItem: CaptureDraft = {
      ...draft,
      title: draft.title.trim(),
      expenses: draft.expenses?.map((expense) => ({
        ...expense,
        title: expense.title.trim(),
      })),
    };
    const firstItemId = saveCapture(savedItem, spaceName);
    const destination =
      draft.type === "reminder"
        ? "/reminders"
        : draft.type === "expense"
          ? "/expenses"
          : "/library";

    setText("");
    setSelectedType(null);
    closeReview();
    router.push(`${destination}#${firstItemId}`);
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mx-auto w-full max-w-3xl px-3 sm:px-6 md:bottom-5"
      >
        <div className="rounded-[26px] border border-white/10 bg-[#211f21] p-3 shadow-[0_18px_70px_rgba(0,0,0,0.5)] sm:p-4">
          <label htmlFor="quick-capture" className="sr-only">
            Capture a note, reminder, expense, list, or moodboard
          </label>
          <textarea
            id="quick-capture"
            className="max-h-32 min-h-12 w-full resize-y bg-transparent px-2 py-1 text-[15px] leading-6 text-[#f5f2ee] outline-none placeholder:text-[#858187] sm:text-base"
            onChange={(event) => setText(event.target.value)}
            placeholder="What's on your mind?"
            rows={2}
            value={text}
          />
          <div className="flex items-center justify-between gap-2 pt-2">
            <div
              aria-label="Choose a template"
              className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="group"
            >
              {itemTypes.map((type) => (
                <button
                  key={type}
                  aria-pressed={selectedType === type}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${
                    selectedType === type
                      ? "border-[#9fb5e3] bg-[#35496d] text-white"
                      : "border-white/10 text-[#aaa7a4] hover:border-white/25 hover:text-white"
                  }`}
                  onClick={() =>
                    setSelectedType((current) => (current === type ? null : type))
                  }
                  type="button"
                >
                  {typeLabels[type]}
                </button>
              ))}
            </div>
            <button
              aria-label="Review and save"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-[#9fb5e3] text-[#111318] transition hover:bg-[#b4c6e9] disabled:cursor-not-allowed disabled:bg-[#3b3a3b] disabled:text-[#797779]"
              disabled={!text.trim()}
              type="submit"
            >
              <ArrowUp size={21} strokeWidth={2} />
            </button>
          </div>
        </div>
      </form>

      {step && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center overflow-y-auto overscroll-contain bg-black/70 px-0 sm:items-center sm:px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeReview();
          }}
        >
          <section
            aria-labelledby="capture-dialog-title"
            aria-modal="true"
            className="my-auto max-h-[92dvh] w-full max-w-xl overflow-y-auto overscroll-contain rounded-t-[28px] border border-white/10 bg-[#171617] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[28px] sm:p-7"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#9fb5e3]">
                  {step === "choose" ? "One quick question" : "Check before saving"}
                </p>
                <h2
                  className="serif-heading mt-2 text-3xl text-[#f4f0e9]"
                  id="capture-dialog-title"
                >
                  {step === "choose" ? "What is this?" : "Your preview"}
                </h2>
              </div>
              <button
                aria-label="Close preview"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-white/5 text-[#b3b0ae] hover:bg-white/10"
                onClick={closeReview}
                type="button"
              >
                <X size={19} />
              </button>
            </div>

            {step === "choose" ? (
              <div className="mt-6">
                <p className="text-sm leading-6 text-[#aaa6a4]">
                  I noticed a couple of possible types. Choose the one that fits best.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {itemTypes.map((type) => (
                    <button
                      key={type}
                      className="rounded-2xl border border-white/10 bg-[#211f21] p-4 text-left transition hover:border-[#9fb5e3]/60 hover:bg-[#25242a]"
                      onClick={() => chooseType(type)}
                      type="button"
                    >
                      <span className="block font-medium text-[#f4f0e9]">
                        {typeLabels[type]}
                      </span>
                      <span className="mt-1 block text-xs text-[#918d8c]">
                        {type === "reminder"
                          ? "Something to remember for later"
                          : type === "expense"
                            ? "Money spent or paid"
                            : type === "list"
                              ? "A group of things"
                              : type === "moodboard"
                                ? "Links and inspiration"
                                : "A thought to keep"}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl bg-[#211f21] p-4">
                  <p className="text-xs text-[#918d8c]">Your original text</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#dedbd8]">
                    {text}
                  </p>
                </div>
              </div>
            ) : draft ? (
              <form className="mt-6 space-y-5" onSubmit={handleSave}>
                <div className="rounded-full border border-[#9fb5e3]/25 bg-[#35496d]/25 px-3 py-1.5 text-xs font-medium text-[#c5d5f3]">
                  {typeLabels[draft.type]}
                </div>

                {draft.type === "expense" ? (
                  <div className="space-y-3">
                    {draft.expenses?.map((expense, index) => (
                      <div
                        key={`${index}-${expense.title}`}
                        className="rounded-2xl border border-white/10 bg-[#211f21] p-3"
                      >
                        <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-3">
                          <label className="min-w-0 text-xs text-[#aaa6a4]">
                            {expense.transactionKind === "income" ? "Income" : "Expense"}{" "}
                            {index + 1}
                            <input
                              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#171617] px-3 py-2.5 text-sm text-[#f4f0e9] outline-none focus:border-[#9fb5e3]/60"
                              onChange={(event) =>
                                updateExpense(index, { title: event.target.value })
                              }
                              value={expense.title}
                            />
                          </label>
                          <label className="text-xs text-[#aaa6a4]">
                            Amount
                            <input
                              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#171617] px-3 py-2.5 text-sm text-[#f4f0e9] outline-none focus:border-[#9fb5e3]/60"
                              inputMode="decimal"
                              min="0"
                              onChange={(event) =>
                                updateExpense(index, {
                                  amount: event.target.value
                                    ? Number(event.target.value)
                                    : null,
                                })
                              }
                              step="0.01"
                              type="number"
                              value={expense.amount ?? ""}
                            />
                          </label>
                        </div>
                        <div className="mt-3 flex gap-2">
                          {(["expense", "income"] as const).map((transactionKind) => (
                            <button
                              aria-pressed={expense.transactionKind === transactionKind}
                              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                expense.transactionKind === transactionKind
                                  ? transactionKind === "income"
                                    ? "border-[#9ebc99]/50 bg-[#253322] text-[#d5e5d0]"
                                    : "border-[#9fb5e3]/50 bg-[#26334a] text-[#d2ddf2]"
                                  : "border-white/10 text-[#aaa6a4] hover:border-white/25"
                              }`}
                              key={transactionKind}
                              onClick={() =>
                                updateExpense(index, { transactionKind })
                              }
                              type="button"
                            >
                              {transactionKind === "income" ? "Income" : "Expense"}
                            </button>
                          ))}
                        </div>
                        <div className="mt-4 border-t border-white/[0.06] pt-3">
                          <TagPicker
                            availableTags={tags}
                            onChange={(selected) =>
                              updateExpense(index, { tags: selected })
                            }
                            value={expense.tags ?? []}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <label className="block text-xs text-[#aaa6a4]">
                    {draft.type === "list" ? "List name" : "Title"}
                    <input
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#211f21] px-3.5 py-3 text-base text-[#f4f0e9] outline-none focus:border-[#9fb5e3]/60"
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, title: event.target.value } : current,
                        )
                      }
                      required
                      value={draft.title}
                    />
                  </label>
                )}

                {draft.type === "reminder" && (
                  <div className="space-y-2 rounded-2xl border border-white/10 bg-[#211f21] px-4 py-3">
                    <label className="block space-y-1.5 text-xs text-[#aaa6a4]">
                      Reminder date and time (optional)
                      <input
                        aria-label="Reminder date and time"
                        className="w-full rounded-xl border border-white/10 bg-[#171617] px-3 py-2.5 text-sm text-[#f4f0e9] outline-none color-scheme-dark focus:border-[#9fb5e3]/60"
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  dueAt: event.target.value
                                    ? new Date(event.target.value).toISOString()
                                    : undefined,
                                }
                              : current,
                          )
                        }
                        type="datetime-local"
                        value={draft.dueAt ? toDateTimeLocal(draft.dueAt) : ""}
                      />
                    </label>
                    <p className="text-xs text-[#918d8c]">
                      {draft.dueAt
                        ? `Detected: ${formatDueDate(draft.dueAt)}. You can adjust it.`
                        : "No date or time detected. Save it as an unscheduled reminder, or add a date above."}
                    </p>
                  </div>
                )}

                {draft.entries && draft.type === "list" && (
                  <div className="rounded-2xl border border-white/10 bg-[#211f21] p-4">
                    <p className="text-xs text-[#918d8c]">List items</p>
                    <ul className="mt-2 space-y-2">
                      {draft.entries.map((entry, index) => (
                        <li
                          key={`${index}-${entry}`}
                          className="flex items-center gap-2 text-sm text-[#dedbd8]"
                        >
                          <span className="size-2 rounded-full bg-[#9fb5e3]" />
                          {entry}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-2xl border border-white/10 bg-[#211f21] p-4">
                  <p className="text-xs text-[#918d8c]">Original text — kept with your item</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#dedbd8]">
                    {draft.rawText}
                  </p>
                </div>

                {draft.type !== "expense" && (
                  <div className="space-y-3">
                    <p className="text-xs text-[#aaa6a4]">Space</p>
                    <Picker
                      label="Space"
                      onChange={setSpaceChoice}
                      options={[
                        { value: "none", label: "No space" },
                        { value: "new", label: "Create a new Space" },
                        ...spaces.map((space) => ({
                          value: space.id,
                          label: space.name,
                        })),
                      ]}
                      value={spaceChoice}
                    />
                    {spaceChoice === "new" && (
                      <input
                        aria-label="New Space name"
                        className="w-full rounded-xl border border-white/10 bg-[#211f21] px-3.5 py-3 text-sm text-[#f4f0e9] outline-none placeholder:text-[#777376] focus:border-[#9fb5e3]/60"
                        onChange={(event) => setNewSpaceName(event.target.value)}
                        placeholder="Name this Space"
                        value={newSpaceName}
                      />
                    )}
                    {spaceChoice !== "none" && (
                      <p className="text-xs text-[#918d8c]">
                        {spaceChoice === "new"
                          ? "Create a Space for this and future saves."
                          : "Suggested from your recent saves. You can change it."}
                      </p>
                    )}
                  </div>
                )}

                {error && (
                  <p className="text-sm text-[#f19a91]" role="alert">
                    {error}
                  </p>
                )}

                <button
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#9fb5e3] px-5 text-sm font-semibold text-[#111318] transition hover:bg-[#b4c6e9]"
                  type="submit"
                >
                  <Check size={18} />
                  Save {typeLabels[draft.type].toLowerCase()}
                </button>
              </form>
            ) : null}
          </section>
        </div>
      )}
    </>
  );
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}
