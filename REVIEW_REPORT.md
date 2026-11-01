# myspace Round Table Review

Review date: 2026-11-01  
Scope: read-only review of the current application code and browser UI. The only file created in this phase is this report.

## App summary

- myspace is a browser-local personal organizer built with Next.js, React, TypeScript, and Tailwind.
- It is aimed at an individual who wants one place to capture everyday notes, reminders, money entries, lists, recipes, and ideas.
- A persistent capture box detects a type from text or lets the user choose a template, then previews fields before saving.
- Saved non-money items are organized into user-created Spaces; expenses and income are grouped in Money with tags and totals.
- Data stays in localStorage and IndexedDB on the current browser/device; there is no account, sync, server API, or notification scheduler.

## Review method and limits

The roles below are separate review lenses applied to the same code and browser evidence; they were not separate human interviews or independent agents. Three user personas are hypothetical walkthroughs, not observed usability sessions.

The app was opened at a 390 × 844 mobile viewport. Temporary browser-local records were used to inspect routes and exercise capture, income totals, tags, Space navigation, list toggle/edit, reminder completion, ambiguous detection, and recipe validation. The original organizer localStorage value was restored byte-for-byte afterward. ESLint and TypeScript checks passed. The package has no test script or configured automated test suite. File selection edge cases, storage quota failures, complete keyboard traversal of every control, and desktop-browser rendering remain unverified.

## Round-table findings

### 1. Product Manager

- **Medium — Reminders are records, not scheduled notifications.** The app sorts and displays reminders and allows completion, but no scheduler, notification permission flow, or notification code is present. If alerts remain in scope, this is a feature gap; if not, describe these as in-app reminders. `src/components/organizer-views.tsx:1539-1600`; dependencies in `package.json`.
- **Medium — No user-facing export or backup.** The README correctly says data is device-local and not backed up, but there is no export path for moving or recovering it. `src/components/organizer-store.tsx:13,195-210`; `README.md`.
- **Low — The core capture-and-organize loop is present.** The fixed capture box, preview, item editing, per-Space browsing, grouped transactions, and checklist affordances align with the organizer goal. `src/components/capture-box.tsx`; `src/components/organizer-views.tsx`.

### 2. UX Designer

- **Medium — Space cards are partially hidden by the fixed capture composer on mobile.** At 390 × 844, a 144 px card started at y=581 while the fixed composer started at y=632, overlapping about 93 px; the card name/count area is below the overlap. Scrolling can reveal it, but the first view obscures the main navigation target. `src/components/organizer-views.tsx:1080-1094,1187-1199`; `src/components/capture-box.tsx:203-206`.
- **Medium — Saving a recipe does not land on the saved recipe.** Capture routes to `/library?type=recipe#<item-id>`, but the overview renders Space cards, not an element with that item ID. A user must choose the matching Space to see the saved item; with multiple recipe Spaces, the intended Space is not selected. `/recipes` redirects to the same Space overview. `src/components/capture-box.tsx:186-199`; `src/components/organizer-views.tsx:1230-1300,1467-1517`; `src/app/(organizer)/recipes/page.tsx:1-5`.
- **Medium — The Library exposes a non-working Expense filter.** Its type chips include Expense, but Library filters its source to exclude every expense item, and new expenses are saved without a Space. Selecting Expense therefore yields an empty Space rather than money records. `src/components/organizer-views.tsx:1230,1370-1395`; `src/components/organizer-store.tsx:225-231`.
- **Low — Library search is scoped rather than global.** At the overview, “Search Spaces” only matches Space names; content search appears after a Space is opened. Users must know which Space to search. This is clear from the placeholder but may not satisfy a global “find a note” task. `src/components/organizer-views.tsx:1336-1354`.
- **Low — Deleting a Space is non-destructive to its saved entries.** The app explicitly says they become unfiled; the unfiled card preserves access. This behavior is consistent and appropriately communicated. `src/components/organizer-views.tsx:1398-1403,1481-1500`; `src/components/organizer-store.tsx:341-350`.

### 3. UI / Visual Designer

- **Medium — The composer/card overlap is the strongest mobile visual defect.** The capture box is fixed above bottom navigation, while Home’s horizontal card row occupies the same viewport region. The measured overlap is about 93 px in the tested viewport. `src/components/app-shell.tsx:76,80-82`; `src/components/capture-box.tsx:203-206`; `src/components/organizer-views.tsx:1187-1199`.
- **Medium — Some small placeholder text misses WCAG AA contrast.** Calculated ratios against the declared surfaces: `#777376` on `#211f21` is 3.51:1; `#858187` on `#211f21` is 4.28:1. Both are below 4.5:1 for normal-size text. Examples: capture placeholder and search/list-item placeholders. `src/components/capture-box.tsx:214`; `src/components/organizer-views.tsx:816,1344`; `src/components/tag-picker.tsx:75`.
- **Low — The dark charcoal, muted blue, and serif-heading system is coherent.** Components reuse a consistent card radius, border, and color vocabulary. Mobile horizontal scrolling did not cause main-page horizontal overflow in the tested viewport. `src/app/globals.css`; `src/components/organizer-views.tsx`.
- **Unverified — Desktop and zoom/reflow behavior.** The responsive classes are present, but a full desktop and browser-zoom visual review was not performed.

### 4. Typography Specialist

- **Low — Heading hierarchy is distinctive and consistent.** Geist sans body text with Georgia serif headings separates content titles from controls and metadata. Body card titles are readable, but metadata and placeholders are often 10–12 px and several of the dimmer placeholder colors also fail the contrast check above. `src/app/layout.tsx:2-15`; `src/app/globals.css:24-31`; `src/components/organizer-views.tsx:306-311,1089`.
- **Low — Naming varies between “Process” and “steps.”** Recipe entry fields say “Process (one step per line)” while cards label the section “Process”; this is understandable but could be normalized to “Steps” if that is the user’s preferred term. `src/components/capture-box.tsx:619-629`; `src/components/organizer-views.tsx:560`.

### 5. Content / UX Writer

- **Medium — Income-only captures use the Expense CTA.** The preview identifies the type as Expense and shows the transaction as Income, but the submit button is “Save expense.” This was observed for “Salary ₹50000.” Use neutral copy such as “Save transactions.” `src/components/capture-box.tsx:734-740` (CTA label derives from `typeLabels[draft.type]`).
- **Low — “Space” is a product-specific term.** The interface does not define it for first-time users beyond examples such as “Outfit Inspo.” The metaphor is used consistently, but first-time comprehension is unverified. `src/components/organizer-views.tsx:1326-1329,1400-1409`.
- **Copy cleanup recommendations** are listed below with approximate vertical savings.

### 6. QA Engineer

- **Passed in browser:** four main navigation routes; Space create/open/remove; empty and populated Space states; capture of salary as income; money all-time totals and tag filtering; list checkbox toggle and list edit/add; reminder completion and date display; ambiguous rent/date chooser; recipe-required-fields validation; legacy `/recipes` redirect.
- **Medium — Expense filter behavior is inconsistent with the visible control.** The chip becomes selected, but the Space shows “This Space is empty”; verified in the browser. `src/components/organizer-views.tsx:1370-1395,1519-1533`.
- **Medium — Recipe redirect shows a filtered Space overview, not recipe cards.** Verified at `/recipes`; the URL becomes `/library?type=recipe` and shows recipe Spaces. This is consistent with the new Library structure but does not land on the saved recipe. `src/app/(organizer)/recipes/page.tsx:1-5`; `src/components/organizer-views.tsx:1467-1517`.
- **Low — No automated regression suite is configured.** `package.json` defines `dev`, `build`, `start`, and `lint`, but no test script. Browser checks cover key paths, not every field combination or validation boundary. `package.json:5-10`.
- **Unverified — Image MIME/15 MB boundary cases, malformed URLs, quota/blocked storage behavior, keyboard operation across every menu/control, and multi-tab synchronization.**
- **Observed non-product browser events:** route requests were cancelled during fast client navigation, and Next.js emitted font-preload warnings. No uncaught application exception was observed; the cancellations/warnings were not reproduced as user-facing failures.

### 7. Accessibility Auditor

- **Medium — The capture dialog does not behave as a keyboard modal.** It has `role="dialog"`, `aria-modal="true"`, and a labelled title, but Escape does not close it, focus remains on the background “Review and save” button, and focus is not trapped in the dialog. Verified with keyboard interaction. `src/components/capture-box.tsx:313-339`.
- **Medium — The custom Picker has incomplete listbox keyboard behavior.** It closes on Escape and its options are labelled, but there is no Arrow Up/Down, Home/End, or managed option focus. Keyboard users must tab through option buttons. `src/components/picker.tsx:35-42,58-80`.
- **Medium — Placeholder contrast is below AA in the tested color pairs.** 3.51:1 and 4.28:1 for normal text, as listed above. `src/components/capture-box.tsx:214`; `src/components/organizer-views.tsx:816,1344`.
- **Low — Positive patterns:** navigation has accessible names and current-page state; capture has a visually hidden label; icon-only controls generally have accessible names; the saved image uses a role and accessible label. `src/components/app-shell.tsx:33,81`; `src/components/capture-box.tsx:210-213,245`; `src/components/organizer-views.tsx:317-320`; `src/components/idea-image.tsx:43-48`.

### 8. Frontend Developer

- **Medium — Persistence failures are only logged, not surfaced.** `saveSnapshot` updates in-memory state, then catches localStorage write failures with `console.error`; a user can see an apparent save succeed and lose it on refresh. `readStorage` also falls back to empty state on a parse/read exception. `src/components/organizer-store.tsx:58-60,165-171,188-210`.
- **Low — Organizer view file is a large responsibility hub.** `organizer-views.tsx` contains saved-item rendering/editing plus Home, Library, Reminders, and Money views (about 1,740 lines). This raises review and regression cost, although the current build/type/lint checks pass. `src/components/organizer-views.tsx`.
- **Low — Many style colors are repeated inline.** Central CSS variables exist, but most component colors are literal Tailwind arbitrary values. This makes global contrast tuning more laborious. `src/app/globals.css:3-14`; `src/components/organizer-views.tsx`.
- **Low — Image persistence is device-local and uncompressed.** Each selected file is limited to 15 MB, but many uploads can consume browser quota; no compression or user-visible storage management is present. `src/components/capture-box.tsx:253-266`; `src/lib/idea-images.ts`; `README.md`.

### 9. Security Reviewer

- **No Critical or High vulnerability found in the reviewed scope.** The app has no authentication or server data surface by design; no API routes, network fetches, environment secrets, or `dangerouslySetInnerHTML` usage were found under `src/`.
- **Low — Device-profile privacy is the security boundary.** Organizer records and image blobs are unencrypted in localStorage/IndexedDB and are available to scripts running in the same origin/browser profile. This is consistent with the local-only design, but not appropriate for shared browser profiles or sensitive records. `src/components/organizer-store.tsx:13,66,195-205`; `src/lib/idea-images.ts:1-12`; `README.md`.
- **Positive:** captured text is rendered through React text nodes; idea links are limited to HTTP(S) before rendering and open with `rel="noreferrer"`. `src/components/organizer-views.tsx:510-520`; `src/components/capture-box.tsx:154-159`.
- **Review limit:** this is a source/UI review, not a penetration test or dependency audit. Runtime behavior in hostile browser extensions or compromised same-origin scripts was not tested.

### 10. End users (three hypothetical personas)

- **First-time user — Medium friction:** The capture field and type chips are easy to find, and uncertain captures ask for a type. “Space” and automatic default Space assignment may be unclear; seeing the item requires opening the generated Space. The large Home introduction and card/composer overlap compete with the main task. `src/components/capture-box.tsx:203-239,689-720`; `src/components/organizer-views.tsx:1129-1133,1187-1199`.
- **Power user — Medium friction:** Grouped transactions, saved tags, type filters, and per-Space search support repeated use. There is no global content search, export, or multi-device sync; cross-Space retrieval requires knowing where an item lives. `src/components/organizer-views.tsx:1230,1336-1354,1617-1665`; `README.md`.
- **Non-technical user — Medium risk:** Explicit review, examples, delete confirmation, and local-only documentation are reassuring. A reminder currently does not notify outside the app, and browser-storage failure is not surfaced to the user. `src/components/capture-box.tsx:313-339`; `src/components/organizer-store.tsx:188-210`; `src/components/organizer-views.tsx:1539-1600`.

## Round-table discussion and agreed resolution

1. **Keep local-first simplicity; do not add accounts or a server merely to solve backup.** Product and Security agree that local-only storage is intentional and reduces exposed server surface. They recommend an explicit export/import path as a separate user-approved feature, plus clearer recovery expectations.
2. **Preserve Spaces as the Library’s top-level structure, but make post-save routing specific.** UX prefers keeping the collection-card overview; QA notes the recipe save hash currently targets an item not rendered on that overview. Resolution: route to the selected Space/item rather than replacing the collection model.
3. **Keep useful instructions, remove promotional repetition.** Visual Design and Content agree to remove slogans and duplicated headings but retain copy that explains automatic detection, original-text retention, Space selection, and empty-state next actions.
4. **Clarify reminder behavior before implementing notifications.** Product favors avoiding surprise permissions. Resolution: state that these are in-app reminders unless notification delivery is explicitly approved; if alerts are required, add an opt-in notification design as a separate change.
5. **Treat keyboard dialog behavior and mobile overlap as functional polish, not cosmetic-only.** QA and Accessibility agree these affect task completion and should precede visual refinements.

## Content cleanup list

Approximate savings are based on current Tailwind line heights/margins at a mobile viewport. They are estimates, not measured redesign results; savings from different pages should not be added together.

| Location | Current text | Verdict | Reason / approximate vertical space |
|---|---|---|---|
| `src/components/organizer-views.tsx:1133` | “A calm place for the things you want to remember.” | Remove | Promotional tagline after the hero; no task instruction. About 24–36 px on Home. |
| `src/components/organizer-views.tsx:1174` | “Your collections” | Remove | Redundant immediately above “Spaces.” About 16–20 px on Home. |
| `src/components/organizer-views.tsx:1321` | “Your saved collections” | Remove | Repeats the Library heading. About 20–28 px in the overview. |
| `src/components/organizer-views.tsx:1329` | “Choose a Space to browse the things you want to keep.” | Keep | Directly tells the user what to do in the new card-only overview. No savings recommended. |
| `src/components/organizer-views.tsx:1549` | “Dates and things to come back to” | Remove | Vague pre-heading that repeats “Reminders.” About 20–28 px. |
| `src/components/organizer-views.tsx:1554` | “Dates detected from your text are shown here. You can mark an item done whenever you’re ready.” | Shorten | The action is already on each card; retain only the useful detection detail, e.g. “Dates recognized in captures appear here.” About 24–40 px saved on mobile. |
| `src/components/organizer-views.tsx:1617` | “Income and spending, together” | Remove | Repeats the Money heading. About 20–28 px. |
| `src/components/organizer-views.tsx:1622` | “Amounts and income or expense type are detected from your text when they’re clear. Your original text is kept with every transaction.” | Shorten | Useful behavior disclosure, but too long under the heading; use one concise sentence. About 24–48 px saved depending on wrapping. |
| `src/components/capture-box.tsx:325` | “Check before saving” | Remove | Duplicates “Your preview” in the same dialog header. About 16–24 px. Keep “One quick question” for the type chooser. |
| `src/components/app-shell.tsx:55-58` | “A little space for everything.” / “Your personal organizer, kept simple.” | Remove | Desktop-only promotional copy with no action; the sidebar logo and navigation already establish the app. Frees about 40–50 px inside the footer card. |
| `src/components/app-shell.tsx:71-73` | “Your personal space” / “Your organizer” | Shorten | Two simultaneous generic descriptors; keep one concise header label. No meaningful vertical savings, but less redundant chrome. |
| `src/components/organizer-views.tsx:1203` | “Create a Space such as Recipes or Outfit Inspo in Library, then save content into it.” | Keep | Useful next step when there are no Spaces. |
| `src/components/organizer-views.tsx:1593` | “Try ‘Remind me tomorrow to call home’ or tap the Reminder template below.” | Keep | Gives a concrete first action in the empty state. |

Potential savings on the main Home content are approximately 40–55 px; on Reminders, approximately 45–65 px; on Money, approximately 45–75 px. These are separate screen estimates.

## Prioritized change list

| # | Issue | Suggested fix | Effort | Priority |
|---:|---|---|:---:|:---:|
| 1 | Dialog Escape/focus behavior and custom Picker keyboard behavior | Add predictable initial focus, focus containment/restoration, Escape close, and arrow-key option navigation; verify with keyboard and screen reader. | M | P1 |
| 2 | Home Space card content occluded by fixed capture composer on mobile | Reserve sufficient scroll/viewport space or adjust the composer/card layout so card labels are visible before scrolling. | S | P1 |
| 3 | Recipe save route drops the chosen Space/item context | Navigate to the actual selected Space and item anchor after save; make `/recipes` resolve to a useful recipe listing within Library. | S | P1 |
| 4 | Expense filter appears in Library although expenses are excluded | Remove the Expense chip from Library filters or direct it to Money; keep available filters consistent with stored content. | S | P1 |
| 5 | Income-only preview button says “Save expense” | Use a neutral CTA such as “Save transactions.” | S | P2 |
| 6 | Storage write/read failures can look like successful saves | Surface actionable persistence errors and do not report success when the browser write failed. | M | P2 |
| 7 | Placeholder text contrast is below AA | Raise the muted foreground colors to at least 4.5:1 on their actual surfaces and recheck all states. | S | P2 |
| 8 | No global content search | Add an all-Space search or clearly state that search is scoped to the current Space. | M | P2 |
| 9 | No export/backup and no reminder notification delivery | Decide scope; consider an explicit local export/import first, and separately design opt-in notifications if required. | L | P2 |
| 10 | No automated flow tests | Add focused tests for detection, grouped money, local persistence, Space filtering, and capture validation. | M | P2 |
| 11 | Uncompressed device-only image uploads | Consider client-side compression and storage/quota guidance. | M | P3 |
| 12 | Large combined organizer view module | Split by view/editor only when making follow-up changes, with tests to preserve behavior. | M | P3 |

## Quick wins vs. bigger changes

**Quick wins**

- Replace the income-only “Save expense” label with neutral wording.
- Remove or route the Library Expense filter.
- Fix recipe save routing to preserve the selected Space and item anchor.
- Raise placeholder colors to AA contrast.
- Remove redundant slogans and pre-heading copy.
- Adjust the Home card/composer overlap.

**Bigger changes**

- Accessible modal focus management and complete keyboard interaction for custom pickers.
- User-controlled export/import and robust handling of storage quota failures.
- Global search across Spaces.
- Opt-in reminder notifications, if they remain a product requirement.
- Automated browser and data-migration regression coverage.

## What is working well

- Local-only storage is straightforward, avoids account setup, and is disclosed in the README.
- Capture provides a preview and preserves the original text; ambiguous money/reminder content asks for a type.
- Expense capture groups transactions and correctly updated the tested all-time income/expense/balance summary.
- Lists support check/uncheck and edit; reminders support completion and display a default 9 AM when only a date is detected.
- Space management includes a confirmation step and preserves its entries by making them unfiled rather than deleting them.
- Responsive navigation, labeled capture controls, page-level navigation names, and a consistent card/color system are present.
- Current `npm run lint` and `npx tsc --noEmit` passed; the production build also passed during the immediately preceding implementation validation.

## Implementation follow-up

Follow-up changes made after the review:

- Added Escape handling, focus restoration, and focus containment to the capture dialog; the custom picker now supports arrow keys, Home/End, Enter, and Escape.
- Moved Home Spaces above reminders to keep the cards clear of the fixed composer, fixed item-specific save routing, removed the unusable Library Expense filter, and added a legacy route redirect to Money.
- Added cross-Space content search, neutral transaction-save copy, and clearer reminder/recipe wording; removed the redundant promotional labels and descriptions identified above.
- Raised the audited placeholder colors to 5.26:1 contrast on the tested input surface.
- Made persistence writes commit before updating the UI, surfaced storage failures with a retry action, and paused writes after unreadable data to avoid overwriting it.
- Added local JSON backup/restore for organizer data and idea images, plus client-side image compression when it reduces file size.
- Added six regression tests for detection, grouped expense parsing, reminder titles, and backup validation. Lint, TypeScript, tests, and production build passed; browser checks covered the primary fixes and image-inclusive backup/restore.

Reminder notifications remain deferred by request; the interface and README now state that reminders do not notify outside myspace. The large `organizer-views.tsx` module was left intact because splitting it is a non-behavioral refactor with broader regression risk than the functional fixes.
