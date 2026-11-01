import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCaptureDraft,
  detectType,
  parseReminderDate,
} from "../src/lib/organizer";
import { parseOrganizerBackup } from "../src/lib/organizer-backup";

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
