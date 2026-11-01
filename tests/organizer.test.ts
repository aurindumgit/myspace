import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCaptureDraft,
  detectType,
  getExpenseTotals,
  normalizeExpenseCurrency,
  parseReminderDate,
} from "../src/lib/organizer";
import { parseOrganizerBackup } from "../src/lib/organizer-backup";
import {
  getReminderNotificationId,
  getScheduledReminders,
} from "../src/lib/reminder-notifications";

describe("capture detection", () => {
  it("detects reminders and keeps the action as the title", () => {
    const rawText = "Remind me tomorrow to call mum";
    const dueAt = parseReminderDate(rawText);
    const draft = createCaptureDraft("reminder", rawText, dueAt);

    assert.ok(dueAt);
    assert.equal(detectType(rawText).type, "reminder");
    assert.equal(draft.title, "call mum");
  });

  it("detects grouped rupee entries as one expense capture", () => {
    const draft = createCaptureDraft(
      "expense",
      "Groceries Vishal Mega Mart\n23rs cloth\n40rs chips",
    );

    assert.equal(detectType(draft.rawText).type, "expense");
    assert.equal(draft.title, "Groceries Vishal Mega Mart");
    assert.deepEqual(
      draft.expenses?.map(({ title, amount }) => ({ title, amount })),
      [
        { title: "cloth", amount: 23 },
        { title: "chips", amount: 40 },
      ],
    );
  });

  it("uses rupees for entries with rs, a rupee symbol, or no currency marker", () => {
    const draft = createCaptureDraft(
      "expense",
      "Groceries\n23rs cloth\n₹40 chips\nSalary 50000",
    );

    assert.deepEqual(
      draft.expenses?.map(({ amount, currency, transactionKind }) => ({
        amount,
        currency,
        transactionKind,
      })),
      [
        { amount: 23, currency: "₹", transactionKind: "expense" },
        { amount: 40, currency: "₹", transactionKind: "expense" },
        { amount: 50000, currency: "₹", transactionKind: "income" },
      ],
    );
  });

  it("asks the user when a capture signals both money and a reminder", () => {
    const result = detectType("Pay rent ₹12000 tomorrow");

    assert.equal(result.type, null);
    assert.equal(result.uncertain, true);
    assert.ok(result.dueAt);
  });

  it("keeps ordinary multi-line groceries as a checklist", () => {
    const result = detectType("Groceries\nMilk\nBread");

    assert.equal(result.type, "list");
    assert.equal(result.uncertain, false);
  });
});

describe("rupee transaction totals", () => {
  it("combines transactions regardless of their previously saved currency marker", () => {
    const normalized = [
      normalizeExpenseCurrency({
        title: "Cash",
        amount: 500,
        currency: "",
        transactionKind: "income",
      }),
      normalizeExpenseCurrency({
        title: "Food",
        amount: 120,
        currency: "Rs",
        transactionKind: "expense",
      }),
      normalizeExpenseCurrency({
        title: "Travel",
        amount: 80,
        currency: "₹",
        transactionKind: "expense",
      }),
    ];

    assert.deepEqual(normalized.map(({ currency }) => currency), ["₹", "₹", "₹"]);
    assert.deepEqual(getExpenseTotals(normalized), { income: 500, expense: 200 });
  });
});

describe("backup validation", () => {
  const validBackup = {
    format: "myspace-backup",
    version: 1,
    exportedAt: "2026-11-01T00:00:00.000Z",
    data: {
      items: [
        {
          id: "idea-1",
          type: "idea",
          title: "Inspiration",
          rawText: "Inspiration",
          createdAt: "2026-11-01T00:00:00.000Z",
          imageId: "image-1",
        },
      ],
      spaces: [{ id: "space-1", name: "Ideas", color: "#8fa8d8" }],
      tags: [],
      ideaTags: [],
    },
    images: [
      {
        id: "image-1",
        dataUrl: "data:image/webp;base64,AA==",
      },
    ],
  };

  it("accepts a complete backup with attached images", () => {
    assert.equal(parseOrganizerBackup(validBackup).data.items.length, 1);
  });

  describe("reminder notifications", () => {
    it("only schedules future, incomplete reminders with a due time", () => {
      const now = Date.parse("2026-11-01T10:00:00.000Z");
      const items = [
        {
          id: "future",
          type: "reminder",
          title: "Future",
          rawText: "Future",
          createdAt: "2026-11-01T09:00:00.000Z",
          dueAt: "2026-11-01T11:00:00.000Z",
        },
        {
          id: "completed",
          type: "reminder",
          title: "Completed",
          rawText: "Completed",
          createdAt: "2026-11-01T09:00:00.000Z",
          dueAt: "2026-11-01T11:00:00.000Z",
          done: true,
        },
        {
          id: "past",
          type: "reminder",
          title: "Past",
          rawText: "Past",
          createdAt: "2026-11-01T09:00:00.000Z",
          dueAt: "2026-11-01T09:00:00.000Z",
        },
        {
          id: "unscheduled",
          type: "reminder",
          title: "Unscheduled",
          rawText: "Unscheduled",
          createdAt: "2026-11-01T09:00:00.000Z",
        },
      ] as const;

      assert.deepEqual(
        getScheduledReminders([...items], now).map(({ id }) => id),
        ["future"],
      );
    });

    it("creates a stable positive Android notification ID", () => {
      const id = getReminderNotificationId("reminder-123");

      assert.ok(id > 0);
      assert.equal(getReminderNotificationId("reminder-123"), id);
      assert.notEqual(getReminderNotificationId("reminder-456"), id);
    });
  });

  it("rejects backups with missing image data", () => {
    const invalidBackup = {
      ...validBackup,
      images: [],
    };

    assert.throws(
      () => parseOrganizerBackup(invalidBackup),
      /missing one or more saved images/i,
    );
  });
});
