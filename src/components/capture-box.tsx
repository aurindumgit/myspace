"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Check, ImagePlus, Plus, X } from "lucide-react";
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
import { ReminderDateTimePicker } from "@/components/reminder-date-time-picker";
import { TagPicker } from "@/components/tag-picker";
import {
  compressIdeaImage,
  deleteIdeaImage,
  saveIdeaImage,
} from "@/lib/idea-images";

function formatDueDate(value: string) {
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
  return `${date} at ${time}`;
}

export function CaptureBox() {
  const router = useRouter();
  const { spaces, tags, ideaTags, saveCapture, suggestedSpace } =
    useOrganizerStore();
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File>();
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);
  const [step, setStep] = useState<"choose" | "review" | null>(null);
  const [draft, setDraft] = useState<CaptureDraft | null>(null);
  const [spaceChoice, setSpaceChoice] = useState("new");
  const [newSpaceName, setNewSpaceName] = useState("");
  const [error, setError] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const dialogCloseRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!step) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [step]);

  useEffect(() => {
    if (step) {
      if (!previousFocusRef.current && document.activeElement instanceof HTMLElement) {
        previousFocusRef.current = document.activeElement;
      }
      const frame = window.requestAnimationFrame(() => dialogCloseRef.current?.focus());
      return () => window.cancelAnimationFrame(frame);
    }

    previousFocusRef.current?.focus();
    previousFocusRef.current = null;
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
    if (!rawText && !imageFile) return;
    const capturedText = rawText || `Image: ${imageFile?.name ?? "Idea image"}`;

    if (imageFile) {
      openReview("idea", capturedText);
      return;
    }

    if (selectedType) {
      const detection = detectType(capturedText);
      openReview(selectedType, capturedText, selectedType === "reminder" ? detection.dueAt : undefined);
      return;
    }

    const detection = detectType(capturedText);
    if (detection.uncertain || !detection.type) {
      setStep("choose");
      setError("");
      return;
    }

    openReview(detection.type, capturedText, detection.dueAt);
  }

  function chooseType(type: ItemType) {
    const rawText = text.trim() || `Image: ${imageFile?.name ?? "Idea image"}`;
    const detection = detectType(rawText);
    openReview(type, rawText, type === "reminder" ? detection.dueAt : undefined);
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

  async function handleSave(event: FormEvent<HTMLFormElement>) {
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
      (!draft.expenses?.length ||
        draft.expenses.some((expense) => !expense.title.trim()))
    ) {
      setError("Keep at least one named transaction in this capture.");
      return;
    }
    if (
      draft.type === "recipe" &&
      (!draft.ingredients?.length || !draft.steps?.length)
    ) {
      setError("Add at least one ingredient and one process step.");
      return;
    }
    if (
      draft.type === "idea" &&
      draft.link?.trim() &&
      !/^https?:\/\//i.test(draft.link.trim())
    ) {
      setError("Use a link that starts with http:// or https://.");
      return;
    }

    const savedItem: CaptureDraft = {
      ...draft,
      title: draft.title.trim() || "Expense",
      expenses: draft.expenses?.map((expense) => ({
        ...expense,
        title: expense.title.trim(),
      })),
    };
    try {
      if (imageFile) {
        if (draft.type !== "idea") {
          setError("Choose Idea to attach an image.");
          return;
        }
        savedItem.imageId = crypto.randomUUID();
        await saveIdeaImage(savedItem.imageId, await compressIdeaImage(imageFile));
      }
    } catch (cause) {
      console.error("Could not save this idea image.", cause);
      setError("The image could not be saved on this device. Try a smaller image.");
      return;
    }

    const savedResult = saveCapture(savedItem, spaceName);
    if (!savedResult) {
      if (savedItem.imageId) {
        try {
          await deleteIdeaImage(savedItem.imageId);
        } catch (cause) {
          console.error("Could not clean up an unsaved idea image.", cause);
        }
      }
      setError("This capture was not saved. Check the storage message and try again.");
      return;
    }

    const destination =
      draft.type === "reminder"
        ? `/reminders#${savedResult.id}`
        : draft.type === "expense"
          ? `/expenses#${savedResult.id}`
          : `/library?space=${encodeURIComponent(savedResult.spaceId ?? "unfiled")}${draft.type === "recipe" ? "&type=recipe" : ""}#${savedResult.id}`;

    setText("");
    setImageFile(undefined);
    setSelectedType(null);
    closeReview();
    router.push(destination);
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mx-auto w-full max-w-3xl px-3 sm:px-6 md:bottom-5"
      >
        <div className="rounded-[26px] border border-white/10 bg-[#211f21] p-3 shadow-[0_18px_70px_rgba(0,0,0,0.5)] sm:p-4">
          <label htmlFor="quick-capture" className="sr-only">
            Capture a note, reminder, expense, list, recipe, or idea
          </label>
          <textarea
            id="quick-capture"
            className="max-h-32 min-h-12 w-full resize-y bg-transparent px-2 py-1 text-[15px] leading-6 text-[#f5f2ee] outline-none placeholder:text-[#969190] sm:text-base"
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
              aria-label="Attach an idea image"
              className="grid size-10 shrink-0 place-items-center rounded-full text-[#aaa7a4] transition hover:bg-white/[0.07] hover:text-white"
              onClick={() => imageInput.current?.click()}
              type="button"
            >
              <ImagePlus size={18} />
            </button>
            <input
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (!file.type.startsWith("image/")) {
                  setError("Choose an image file.");
                  event.target.value = "";
                  return;
                }
                if (file.size > 15 * 1024 * 1024) {
                  setError("Choose an image smaller than 15 MB.");
                  event.target.value = "";
                  return;
                }
                setError("");
                setImageFile(file);
                setSelectedType("idea");
              }}
              ref={imageInput}
              type="file"
            />
            <button
              aria-label="Review and save"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-[#9fb5e3] text-[#111318] transition hover:bg-[#b4c6e9] disabled:cursor-not-allowed disabled:bg-[#3b3a3b] disabled:text-[#797779]"
              disabled={!text.trim() && !imageFile}
              type="submit"
            >
              <ArrowUp size={21} strokeWidth={2} />
            </button>
          </div>
          {imageFile && (
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#171617] px-3 py-2 text-xs text-[#b8b4b1]">
              <ImagePlus size={14} className="shrink-0 text-[#9fb5e3]" />
              <span className="min-w-0 flex-1 truncate">{imageFile.name}</span>
              <button
                aria-label="Remove attached image"
                className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-white/[0.08]"
                onClick={() => {
                  setImageFile(undefined);
                  if (imageInput.current) imageInput.current.value = "";
                }}
                type="button"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {error && !step && (
            <p className="mt-2 text-xs text-[#f19a91]" role="alert">
              {error}
            </p>
          )}
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
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closeReview();
                return;
              }
              if (event.key !== "Tab") return;

              const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
                'a[href], summary, button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
              );
              if (!focusable?.length) {
                event.preventDefault();
                return;
              }
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              const activeIndex = Array.from(focusable).indexOf(
                document.activeElement as HTMLElement,
              );
              if (activeIndex === -1) {
                event.preventDefault();
                (event.shiftKey ? last : first)?.focus();
              } else if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }}
            ref={dialogRef}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                {step === "choose" && (
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#9fb5e3]">
                    One quick question
                  </p>
                )}
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
                ref={dialogCloseRef}
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
                              : type === "recipe"
                                ? "Ingredients and cooking steps"
                                : type === "idea"
                                  ? "Text, links, images, and tags"
                                  : "A thought to keep"}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl bg-[#211f21] p-4">
                  <p className="text-xs text-[#918d8c]">Your original text</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#dedbd8]">
                    {text || imageFile?.name}
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
                    <label className="block text-xs text-[#aaa6a4]">
                      Group title (optional)
                      <input
                        className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#211f21] px-3.5 py-3 text-base text-[#f4f0e9] outline-none focus:border-[#9fb5e3]/60"
                        onChange={(event) =>
                          setDraft((current) =>
                            current ? { ...current, title: event.target.value } : current,
                          )
                        }
                        value={draft.title}
                      />
                    </label>
                    {draft.expenses?.map((expense, index) => (
                      <div
                        key={`${index}-${expense.title}`}
                        className="rounded-2xl border border-white/10 bg-[#211f21] p-3"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs text-[#8e8a89]">
                            Transaction {index + 1}
                          </span>
                          <button
                            aria-label={`Remove ${expense.title || `transaction ${index + 1}`}`}
                            className="grid size-8 place-items-center rounded-full text-[#c98e89] hover:bg-white/[0.06]"
                            onClick={() =>
                              setDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      expenses: current.expenses?.filter(
                                        (_, expenseIndex) => expenseIndex !== index,
                                      ),
                                    }
                                  : current,
                              )
                            }
                            type="button"
                          >
                            <X size={15} />
                          </button>
                        </div>
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
                    <button
                      className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 px-3 text-xs text-[#d9d4d0] hover:border-white/25"
                      onClick={() =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                expenses: [
                                  ...(current.expenses ?? []),
                                  {
                                    title: "",
                                    amount: null,
                                    currency: "₹",
                                    transactionKind: "expense",
                                    tags: [],
                                  },
                                ],
                              }
                            : current,
                        )
                      }
                      type="button"
                    >
                      <Plus size={14} />
                      Add transaction
                    </button>
                  </div>
                ) : (
                  <label className="block text-xs text-[#aaa6a4]">
                    {draft.type === "list"
                      ? "List name"
                      : draft.type === "recipe"
                        ? "Recipe title"
                        : "Title"}
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

                {draft.type === "note" && (
                  <label className="block text-xs text-[#aaa6a4]">
                    Note
                    <textarea
                      className="mt-1.5 min-h-28 w-full rounded-xl border border-white/10 bg-[#211f21] px-3.5 py-3 text-sm leading-6 text-[#f4f0e9] outline-none focus:border-[#9fb5e3]/60"
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, body: event.target.value } : current,
                        )
                      }
                      value={draft.body ?? draft.rawText}
                    />
                  </label>
                )}

                {draft.type === "idea" && (
                  <div className="space-y-4">
                    <label className="block text-xs text-[#aaa6a4]">
                      Idea text
                      <textarea
                        className="mt-1.5 min-h-24 w-full rounded-xl border border-white/10 bg-[#211f21] px-3.5 py-3 text-sm leading-6 text-[#f4f0e9] outline-none focus:border-[#9fb5e3]/60"
                        onChange={(event) =>
                          setDraft((current) =>
                            current ? { ...current, body: event.target.value } : current,
                          )
                        }
                        value={draft.body ?? ""}
                      />
                    </label>
                    <label className="block text-xs text-[#aaa6a4]">
                      Link (optional)
                      <input
                        className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#211f21] px-3.5 py-3 text-sm text-[#f4f0e9] outline-none focus:border-[#9fb5e3]/60"
                        onChange={(event) =>
                          setDraft((current) =>
                            current ? { ...current, link: event.target.value } : current,
                          )
                        }
                        type="url"
                        value={draft.link ?? ""}
                      />
                    </label>
                    <TagPicker
                      availableTags={ideaTags}
                      onChange={(tags) =>
                        setDraft((current) => (current ? { ...current, tags } : current))
                      }
                      value={draft.tags ?? []}
                    />
                    {imageFile && (
                      <p className="text-xs text-[#aaa6a4]">
                        Image attached: {imageFile.name} (stored on this device)
                      </p>
                    )}
                  </div>
                )}

                {draft.type === "recipe" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs text-[#aaa6a4]">
                      Ingredients (one per line)
                      <textarea
                        className="mt-1.5 min-h-28 w-full rounded-xl border border-white/10 bg-[#211f21] px-3.5 py-3 text-sm leading-6 text-[#f4f0e9] outline-none focus:border-[#9fb5e3]/60"
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  ingredients: event.target.value
                                    .split(/\r?\n/)
                                    .map((entry) => entry.replace(/^\s*[-*•]\s*/, "").trim())
                                    .filter(Boolean),
                                }
                              : current,
                          )
                        }
                        value={(draft.ingredients ?? []).join("\n")}
                      />
                    </label>
                    <label className="block text-xs text-[#aaa6a4]">
                      Steps (one per line)
                      <textarea
                        className="mt-1.5 min-h-28 w-full rounded-xl border border-white/10 bg-[#211f21] px-3.5 py-3 text-sm leading-6 text-[#f4f0e9] outline-none focus:border-[#9fb5e3]/60"
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  steps: event.target.value
                                    .split(/\r?\n/)
                                    .map((entry) => entry.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
                                    .filter(Boolean),
                                }
                              : current,
                          )
                        }
                        value={(draft.steps ?? []).join("\n")}
                      />
                    </label>
                  </div>
                )}

                {draft.type === "reminder" && (
                  <div className="space-y-2 rounded-2xl border border-white/10 bg-[#211f21] px-4 py-3">
                    <p className="text-xs text-[#aaa6a4]">
                      Reminder date and time (optional)
                    </p>
                    <ReminderDateTimePicker
                      onChange={(dueAt) =>
                        setDraft((current) =>
                          current ? { ...current, dueAt } : current,
                        )
                      }
                      value={draft.dueAt}
                    />
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
                        className="w-full rounded-xl border border-white/10 bg-[#211f21] px-3.5 py-3 text-sm text-[#f4f0e9] outline-none placeholder:text-[#969190] focus:border-[#9fb5e3]/60"
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
                  {draft.type === "expense"
                    ? "Save transactions"
                    : `Save ${typeLabels[draft.type].toLowerCase()}`}
                </button>
              </form>
            ) : null}
          </section>
        </div>
      )}
    </>
  );
}
