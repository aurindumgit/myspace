# myspace

A simple personal organizer for reminders, grouped income and expenses, lists, recipes, ideas, and notes.

Capture entries are saved locally. Organize non-money items into Spaces, add optional tags to transactions and ideas, and edit or delete items from each card's actions menu. Recipe cards keep ingredients and process steps searchable. A multi-line money capture stays together as one card with editable transactions inside it; Money keeps an all-time income, expense, and balance summary visible while you browse. Date-only reminders default to 9:00 AM and display dates as day, month name, and year. The Home screen shows Spaces ordered by the most recently saved item, and each card opens that Space's contents.

Idea images are compressed when possible and stored in IndexedDB; text and organizer data are stored in localStorage. In the Android app, these stores are private to the app on that device. Android system backup is enabled where the device supports it, but recovery after reinstall depends on the device's backup settings. Use Library → Manage spaces → Data backup to export a backup, including attached images, and save it outside the app for reliable recovery or transfer. Importing a backup replaces the current data. Nothing is synced automatically. Removing a Space leaves its items in the Library without a Space. Older saved categories and moodboards are migrated in the browser.

On Android, reminders can send local notifications at their scheduled time. Allow notifications and exact alarms when Android asks; exact delivery depends on the device granting alarm access and not restricting the app's background activity. Each notification offers Done and Reschedule actions. Notifications do not use a server.

## Run locally

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No account or external service is needed.

Saved items stay in this browser or installed app on this device. The website and APK have separate local storage and do not sync across browsers or devices.

## Build the Android APK

The Android app is a self-contained offline build. Install Android Studio and its Android SDK, then set up a Java 21 JDK and `ANDROID_HOME` (or `ANDROID_SDK_ROOT`). From this folder, run:

```bash
npm install
npm run android:assets
npm run android:apk
```

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. Share that APK with each person who will install the app. Each installation has its own local data. To preserve data across an uninstall, rely on Android's device backup where available or export a backup file to shared storage before uninstalling; Android does not guarantee app-private data survives uninstall.
