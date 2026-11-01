import * as chrono from "chrono-node";

export const itemTypes = [
  "reminder",
  "expense",
  "list",
  "recipe",
  "idea",
  "note",
] as const;

export type ItemType = (typeof itemTypes)[number];
export type TransactionKind = "income" | "expense";

export type OrganizerSpace = {
  id: string;
  name: string;
  color: string;
};

export type OrganizerTag = string;

export type ExpenseDraft = {
  id?: string;
  title: string;
  amount: number | null;
  currency: string;
  transactionKind: TransactionKind;
  tags?: OrganizerTag[];
};

export function normalizeExpenseCurrency(expense: ExpenseDraft): ExpenseDraft {
  return { ...expense, currency: "₹" };
}

export function getExpenseTotals(expenses: ExpenseDraft[]) {
  return expenses.reduce(
    (totals, expense) => {
      if (expense.amount === null) return totals;
      totals[expense.transactionKind] += expense.amount;
      return totals;
    },
    { income: 0, expense: 0 },
  );
}

export type OrganizerItem = {
  id: string;
  type: ItemType;
  title: string;
  rawText: string;
  spaceId?: string;
  tags?: OrganizerTag[];
  createdAt: string;
  done?: boolean;
  dueAt?: string;
  body?: string;
  amount?: number;
  currency?: string;
  transactionKind?: TransactionKind;
  entries?: { text: string; done: boolean }[];
  expenses?: ExpenseDraft[];
  ingredients?: string[];
  steps?: string[];
  link?: string;
  imageId?: string;
};

export type CaptureDraft = {
  type: ItemType;
  title: string;
  rawText: string;
  dueAt?: string;
  expenses?: ExpenseDraft[];
  entries?: string[];
  body?: string;
  ingredients?: string[];
  steps?: string[];
  link?: string;
  tags?: OrganizerTag[];
  imageId?: string;
};

export type Detection = {
  type: ItemType | null;
  uncertain: boolean;
  dueAt?: string;
};

function getReminderDate(text: string) {
  const parsedDate = chrono.parse(text, new Date(), { forwardDate: true })[0];
  if (parsedDate) {
    const date = parsedDate.start.date();
    if (!parsedDate.start.isCertain("hour")) {
      date.setHours(9, 0, 0, 0);
    }
    return {
      dueAt: date.toISOString(),
      text: parsedDate.text,
    };
  }

  const dayMatch = text.match(
    /\b(?:on|by|the)\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/i,
  );
  const day = Number(dayMatch?.[1]);
  if (!dayMatch || day < 1 || day > 31) return undefined;

  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  let candidate = new Date(year, month, day, 9);
  if (candidate <= now) {
    month += 1;
    candidate = new Date(year, month, day, 9);
  }
  while (candidate.getDate() !== day) {
    month += 1;
    candidate = new Date(year, month, day, 9);
  }

  year = candidate.getFullYear();
  return {
    dueAt: new Date(year, candidate.getMonth(), day, 9).toISOString(),
    text: dayMatch[0],
  };
}

function getTransactionSignals(text: string) {
  const dateText = getReminderDate(text)?.text;
  const transactionText = dateText ? text.replace(dateText, " ") : text;
  const hasCurrencyAmount =
    /(?:[₹$€£¥]|\b(?:rs\.?|inr|ruppees?|rupees?))\s*\d|\d[\d,]*(?:\.\d{1,2})?\s*(?:[₹$€£¥]|(?:rs\.?|inr|ruppees?|rupees?)\b)/i.test(
      transactionText,
    );
  const hasAmount = /\d[\d,]*(?:\.\d{1,2})?/.test(transactionText);
  const incomeSignal =
    /\b(?:income|salary|paycheck|wages?|earned|earning|received|credited|deposit|refund|revenue|bonus|commission)\b/i.test(
      transactionText,
    ) && hasAmount;
  const explicitExpenseSignal =
    hasAmount &&
    /\b(?:pay|spent|paid|bought|purchase|purchased|expense|cost|bill|rent|groceries|grocery|lunch|dinner|coffee|fare)\b/i.test(
      transactionText,
    );
  const expenseSignal = hasCurrencyAmount || explicitExpenseSignal;

  return { incomeSignal, expenseSignal, explicitExpenseSignal };
}

export function parseReminderDate(text: string) {
  return getReminderDate(text)?.dueAt;
}

export const typeLabels: Record<ItemType, string> = {
  reminder: "Reminder",
  expense: "Expense",
  list: "List",
  recipe: "Recipe",
  idea: "Idea",
  note: "Note",
};

export const defaultSpaceNames: Record<ItemType, string> = {
  reminder: "Reminders",
  expense: "Transactions",
  list: "Lists",
  recipe: "Recipes",
  idea: "Ideas",
  note: "Notes",
};

export function detectType(text: string): Detection {
  const dueAt = parseReminderDate(text);
  const reminderSignal =
    /\b(?:remind(?:\s+me)?(?:\s+to|\s+on|\s+by|\s+at)?|reminder|due)\b/i.test(
      text,
    ) || Boolean(dueAt);
  const { incomeSignal, expenseSignal, explicitExpenseSignal } =
    getTransactionSignals(text);
  const moneySignal = incomeSignal || expenseSignal;

  if ((reminderSignal && moneySignal) || (incomeSignal && explicitExpenseSignal)) {
    return { type: null, uncertain: true, dueAt };
  }

  if (reminderSignal) {
    return {
      type: "reminder",
      uncertain: false,
      dueAt,
    };
  }

  if (moneySignal) {
    return { type: "expense", uncertain: false };
  }

  const hasRecipeSections =
    /\bingredients?\b/i.test(text) &&
    /\b(?:method|steps?|directions?|instructions?|process)\b/i.test(text);
  if (/\brecipe\b/i.test(text) || hasRecipeSections) {
    return { type: "recipe", uncertain: false };
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const commaItems = text
    .split(/,(?!\d{3}(?:\D|$))/)
    .map((part) => part.trim())
    .filter(Boolean);
  const isBulletList = lines.some((line) => /^[-*•]\s+/.test(line));
  const mentionsList =
    /\b(?:list|shopping list|grocery list|to-?do list|groceries|grocery)\b/i.test(
      text,
    );

  if (lines.length > 1 || isBulletList || mentionsList || commaItems.length > 1) {
    return { type: "list", uncertain: false };
  }

  const urls = text.match(/https?:\/\/\S+/gi) ?? [];
  const textWithoutUrls = text.replace(/https?:\/\/\S+/gi, " ").trim();
  if (urls.length > 0 && textWithoutUrls.split(/\s+/).filter(Boolean).length <= 8) {
    return { type: "idea", uncertain: false };
  }

  return { type: "note", uncertain: false };
}

function getListEntries(text: string) {
  const content = text.replace(
    /^.*?\b(?:groceries|grocery(?:\s+list)?|shopping(?:\s+list)?|to-?do(?:\s+list)?|list)\s*:\s*/i,
    "",
  )
    .replace(
      /^\s*(?:(?:please\s+)?(?:add|put|move)\s+(?:this\s+)?(?:to|in)\s+(?:my\s+)?list|(?:my\s+)?list)\s*/i,
      "",
    )
    .replace(/\s+(?:as|for)\s+(?:a\s+)?list\s*$/i, "");
  const lines = content
    .split(/\r?\n|,(?!\d{3}(?:\D|$))/)
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);

  return lines.length > 1 ? lines : [content.trim()];
}

function getExpenses(text: string): ExpenseDraft[] {
  const parts = text
    .split(/\r?\n|,(?!\d{3}(?:\D|$))/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.map((part) => {
    const { incomeSignal } = getTransactionSignals(part);
    const amountMatch = part.match(
      /([₹$€£¥]|\b(?:rs\.?|inr|ruppees?|rupees?))\s*(\d[\d,]*(?:\.\d{1,2})?)|(\d[\d,]*(?:\.\d{1,2})?)\s*([₹$€£¥]|(?:rs\.?|inr|ruppees?|rupees?)\b)/i,
    );
    const wordAmountMatch = part.match(/\d[\d,]*(?:\.\d{1,2})?/);
    const amountText = amountMatch?.[2] ?? amountMatch?.[3] ?? wordAmountMatch?.[0];
    const amount = amountText
      ? Number.parseFloat(amountText.replace(/,/g, ""))
      : null;
    const title = part
      .replace(
        /^\s*(?:i\s+)?(?:spent|paid|bought|received|earned|credited)\s+/i,
        "",
      )
      .replace(
        /(?:[₹$€£¥]|\b(?:rs\.?|inr|ruppees?|rupees?))\s*\d[\d,]*(?:\.\d{1,2})?|\d[\d,]*(?:\.\d{1,2})?\s*(?:[₹$€£¥]|(?:rs\.?|inr|ruppees?|rupees?)\b)?/i,
        "",
      )
      .replace(
        /^\s*(?:i\s+)?(?:spent|paid|bought|received|earned|credited)\s+/i,
        "",
      )
      .replace(/^\s*(?:for|on|as|from)\s+/i, "")
      .replace(/^[\s:–—-]+|[\s:–—-]+$/g, "")
      .trim();

    return {
      title: title || (incomeSignal ? "Income" : "Expense"),
      amount: Number.isFinite(amount) ? amount : null,
      currency: "₹",
      transactionKind: incomeSignal ? "income" : "expense",
    };
  });
}

function getRecipeSections(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const ingredientHeader = /^(?:ingredients?)\s*:?$/i;
  const stepHeader = /^(?:method|steps?|directions?|instructions?|process)\s*:?$/i;
  let section: "ingredients" | "steps" | null = null;
  const ingredients: string[] = [];
  const steps: string[] = [];

  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim();
    const ingredientMatch = line.match(/^(?:ingredients?)\s*:\s*(.+)$/i);
    const stepMatch = line.match(
      /^(?:method|steps?|directions?|instructions?|process)\s*:\s*(.+)$/i,
    );
    if (ingredientMatch) {
      section = "ingredients";
      ingredients.push(ingredientMatch[1].trim());
      continue;
    }
    if (stepMatch) {
      section = "steps";
      steps.push(stepMatch[1].trim());
      continue;
    }
    if (ingredientHeader.test(line)) {
      section = "ingredients";
      continue;
    }
    if (stepHeader.test(line)) {
      section = "steps";
      continue;
    }
    if (index === 0 && /^recipe\s*[:–—-]/i.test(line)) continue;
    if (section === "ingredients") ingredients.push(line);
    if (section === "steps") steps.push(line);
  }

  return { ingredients, steps };
}

function getIdeaLink(text: string) {
  return text.match(/https?:\/\/\S+/i)?.[0]?.replace(/[.,!?]+$/, "");
}

function getExpenseTitle(text: string, expenses: ExpenseDraft[]) {
  const parts = text
    .split(/\r?\n|,(?!\d{3}(?:\D|$))/)
    .map((part) => part.trim())
    .filter(Boolean);
  const amountPattern =
    /(?:[₹$€£¥]|\b(?:rs\.?|inr|ruppees?|rupees?))\s*\d|\d[\d,]*(?:\.\d{1,2})?\s*(?:[₹$€£¥]|(?:rs\.?|inr|ruppees?|rupees?)\b)/i;
  if (parts.length > 1 && !amountPattern.test(parts[0])) {
    return parts[0].replace(/^[\s:–—-]+|[\s:–—-]+$/g, "").trim();
  }
  return expenses[0]?.title || "Expense";
}

export function createCaptureDraft(
  type: ItemType,
  rawText: string,
  dueAt?: string,
): CaptureDraft {
  const cleanedText = rawText.trim();
  const firstLine =
    cleanedText.split(/\r?\n/, 1)[0]?.replace(/^\s*[-*•]\s*/, "").trim() ??
    cleanedText;

  if (type === "expense") {
    const parts = cleanedText
      .split(/\r?\n|,(?!\d{3}(?:\D|$))/)
      .map((part) => part.trim())
      .filter(Boolean);
    const amountPattern =
      /(?:[₹$€£¥]|\b(?:rs\.?|inr|ruppees?|rupees?))\s*\d|\d[\d,]*(?:\.\d{1,2})?\s*(?:[₹$€£¥]|(?:rs\.?|inr|ruppees?|rupees?)\b)/i;
    const hasHeader =
      parts.length > 1 &&
      !amountPattern.test(parts[0]) &&
      parts.slice(1).some((part) => amountPattern.test(part));
    const expenses = getExpenses(hasHeader ? parts.slice(1).join("\n") : cleanedText);
    return {
      type,
      title: hasHeader ? parts[0] : getExpenseTitle(cleanedText, expenses),
      rawText,
      expenses,
    };
  }

  if (type === "list") {
    const headerMatch = cleanedText.match(
      /\b(groceries|grocery(?:\s+list)?|shopping(?:\s+list)?|to-?do(?:\s+list)?|list)\s*:/i,
    );
    const header = headerMatch?.[1];
    const listName = headerMatch
      ? cleanedText
          .slice(0, headerMatch.index)
          .replace(/^\s*(?:make|create|add|here is|this is)\s+/i, "")
          .trim()
      : "";
    const title = header
      ? /^(?:grocery|groceries)/i.test(header)
        ? "Grocery list"
        : /^(?:shopping)/i.test(header)
          ? "Shopping list"
          : /^(?:to-?do)/i.test(header)
            ? "To-do list"
            : listName || "List"
      : "List";
    return {
      type,
      title: title || "List",
      rawText,
      entries: getListEntries(cleanedText),
    };
  }

  if (type === "recipe") {
    const title = firstLine
      .replace(/^recipe\s*[:–—-]\s*/i, "")
      .trim()
      .slice(0, 80);
    return {
      type,
      title: title || "Recipe",
      rawText,
      ...getRecipeSections(cleanedText),
    };
  }

  if (type === "idea") {
    const link = getIdeaLink(cleanedText);
    const body = link
      ? cleanedText.replace(link, "").trim()
      : cleanedText;
    const firstContentLine = body.split(/\r?\n/).find((line) => line.trim())?.trim();
    let linkTitle = "";
    if (link) {
      try {
        linkTitle = new URL(link).hostname.replace(/^www\./, "");
      } catch {
        linkTitle = "";
      }
    }
    const title =
      firstContentLine
        ?.replace(/^(?:idea|image)\s*[:–—-]\s*/i, "")
        .slice(0, 80) ||
      linkTitle ||
      "Idea";
    return { type, title, rawText, body, link };
  }

  if (type === "reminder") {
    const dateText = dueAt ? getReminderDate(cleanedText)?.text : undefined;
    const title = cleanedText
      .replace(dateText ?? /\b(?:today|tomorrow|tonight|next week|next month)\b/i, "")
      .replace(/^\s*(?:please\s+)?remind(?:\s+me)?(?:\s+to|\s+on|\s+by|\s+at)?\s*/i, "")
      .replace(/^\s*(?:reminder|due)(?:\s+to|\s+on|\s+by|\s+at)?\s*/i, "")
      .replace(/\s+/g, " ")
      .replace(/^[\s:–—-]+|[\s:–—-]+$/g, "")
      .replace(/\s+(?:to|on|by|at)\s*$/i, "")
      .replace(/^(?:to|on|by|at)\s+/i, "")
      .trim();

    return {
      type,
      title: title || "Reminder",
      rawText,
      dueAt,
    };
  }

  return {
    type,
    title: firstLine.slice(0, 80),
    rawText,
    body: cleanedText,
  };
}
