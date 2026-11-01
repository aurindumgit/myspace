# myspace

A simple personal organizer for reminders, grouped income and expenses, lists, recipes, ideas, and notes.

Capture entries are saved locally. Organize non-money items into Spaces, add optional tags to transactions and ideas, and edit or delete items from each card's actions menu. Recipe cards keep ingredients and process steps searchable. A multi-line money capture stays together as one card with editable transactions inside it; Money keeps an all-time income, expense, and balance summary visible while you browse. Date-only reminders default to 9:00 AM and display dates as day, month name, and year. The Home screen shows Spaces ordered by the most recently saved item, and each card opens that Space's contents.

Idea images are compressed when possible and stored in this browser's IndexedDB; text and organizer data are stored in localStorage. Use Library → Manage spaces → Data backup to download or restore a backup, including attached images. Importing a backup replaces the current data. Nothing is synced automatically. Removing a Space leaves its items in the Library without a Space. Older saved categories and moodboards are migrated in the browser.

Reminders are saved in the app but do not send notifications.

## Run locally

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No account or external service is needed.

Saved items stay in this browser on this device. They do not sync across browsers or devices.
