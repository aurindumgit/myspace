import { Suspense } from "react";
import { RemindersView } from "@/components/organizer-views";

export default function RemindersPage() {
  return (
    <Suspense fallback={<p className="mt-8 text-sm text-[#8e8a89]">Loading reminders...</p>}>
      <RemindersView />
    </Suspense>
  );
}
