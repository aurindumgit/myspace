# myspace

myspace is a personal organizer for the small things people want to remember, keep, or sort out. It brings reminders, money records, lists, recipes, ideas, and notes together in one place.

## What it helps with

Everyday information often ends up scattered across notes, messages, browser tabs, and separate apps. myspace gives you one place to capture and organize that information without requiring an account or an internet connection.

Your information is stored on the device where you use myspace. It is not automatically sent to a server or synchronized between devices.

## How it works

1. **Capture something.** Enter a thought, task, list, recipe, transaction, or link in the capture box.
2. **Review how it will be saved.** myspace uses the text to suggest a type and, where possible, extract useful details such as a reminder date, list entries, recipe sections, or money amounts. You can review and edit the result before saving it.
3. **Organize it.** Put non-money items into named Spaces, such as “Recipes” or “Trip ideas.” Add tags to ideas and transactions when useful.
4. **Find and update it later.** Browse or search saved items, edit them, mark checklist entries or reminders done, or delete items you no longer need.

If a capture could reasonably mean more than one thing, myspace asks you to choose how to save it rather than silently making an uncertain choice.

## Features

- **Home:** See your Spaces, ordered by recent activity, and a short list of upcoming reminders.
- **Library:** Browse Spaces and unfiled items; search saved content; filter by item type; create and manage Spaces.
- **Reminders:** Save a task with a date and time. A reminder with a date but no specified time defaults to 9:00 AM.
- **Money:** Record income and expenses, including several transactions in one capture. View all-time income, expense, and balance totals. Money entries use Indian rupees (₹).
- **Lists:** Save multi-line checklists and mark entries complete.
- **Recipes:** Keep ingredients and preparation steps in separate, searchable sections.
- **Ideas:** Save links, notes, tags, and attached images. Larger supported images are compressed when possible.
- **Notes:** Save general text that does not fit another type.
- **Edit and delete:** Update saved items or remove them from their cards.
- **Data backup:** Export saved items and attached images to a JSON backup file, then import that file later.

## Installation and use

### Use the web app locally

Install [Node.js](https://nodejs.org/) and npm, then open a terminal in the project folder and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You do not need an account.

The web app stores its data in that browser on that device. Using myspace in another browser or on another device creates a separate store; data does not sync automatically.

### Build the Android app

To build the Android APK, install [Android Studio](https://developer.android.com/studio) and its Android SDK, and configure a Java 21 JDK and `ANDROID_HOME` or `ANDROID_SDK_ROOT`.

On Windows, run these commands from the project folder:

```bash
npm install
npm run android:assets
npm run android:apk
```

The debug APK is created at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Install or share that APK with the people who will use the app. Each installation keeps its own data. Android may offer device backup, but whether it can restore data depends on the device’s settings. For a dependable copy or transfer, export a backup from **Library → Manage spaces → Data backup** and save it outside the app.

On macOS or Linux, after installing dependencies and generating assets, build using the platform’s Gradle wrapper from the `android` directory:

```bash
npm install
npm run android:assets
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

### Back up or restore data

Open **Library → Manage spaces → Data backup**.

- Choose **Prepare backup**, then download or save the generated file somewhere outside myspace.
- To restore, choose **Import backup** and select a myspace JSON backup.
- **Importing replaces all current myspace data** on that installation.

A backup includes saved items, Spaces, tags, and attached idea images.

## Data and notifications

- Organizer records are stored in browser `localStorage`; attached idea images are stored in IndexedDB.
- In the Android app, these stores are private to the app on that device.
- The web app and Android app have separate local data. There is no automatic cloud sync.
- On Android, scheduled reminders use local notifications; they do not depend on a reminder server. Allow notifications and exact alarms when Android requests them. Exact delivery also depends on Android allowing the app to run without background restrictions. Reminder notifications include **Done** and **Reschedule** actions.
- Android system backup may help restore app data where supported and enabled, but it is not guaranteed to preserve data after uninstalling. Export a backup file before uninstalling if you need a reliable copy.

## Technical overview

### Technology

- Next.js 16 with static export
- React 19 and TypeScript
- Tailwind CSS 4
- Capacitor 8 for the Android app
- IndexedDB and browser `localStorage` for on-device persistence

### Application structure

- `src/app/` — app layout, pages, and API routes
- `src/components/app-shell.tsx` — navigation and shared application shell
- `src/components/capture-box.tsx` — capture, type selection, and review flow
- `src/components/organizer-views.tsx` — Home, Library, Reminders, and Money screens
- `src/components/organizer-store.tsx` — organizer state, persistence, Space management, and backup restore
- `src/lib/organizer.ts` — item types, capture classification, parsing, and money calculations
- `src/lib/organizer-backup.ts` — backup validation, export, and image decoding
- `src/lib/idea-images.ts` — image compression and IndexedDB storage
- `src/lib/reminder-notifications.ts` — Android reminder scheduling and notification IDs
- `tests/organizer.test.ts` — tests for capture parsing, money totals, backup validation, and reminders
- `android/` — native Android project

### Data model

A saved organizer item has an ID, type, title, original captured text, and creation time. Depending on its type, it can also include a Space, tags, a due date, checklist entries, transactions, recipe ingredients and steps, a link, or an image reference.

Spaces group non-money items. Removing a Space does not delete its items; those items remain in the Library as unfiled. Transaction records are shown in Money rather than the Library.

The current backup format is JSON with the format name `myspace-backup` and version `1`. It contains organizer data and any attached images. The importer validates the backup before restoring it.

Older saved categories and moodboards are migrated in the browser when the organizer data is read.

## Development commands

```bash
npm run dev       # Start the local development server
npm run build     # Build the static web app
npm test          # Run the test suite
npm run lint      # Run ESLint
```
