import { Suspense } from "react";
import { LibraryView } from "@/components/organizer-views";

export default function LibraryPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[#8e8a89]">Loading your library...</p>}>
      <LibraryView />
    </Suspense>
  );
}
