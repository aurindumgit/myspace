"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  CalendarDays,
  House,
  ReceiptText,
} from "lucide-react";
import { CaptureBox } from "@/components/capture-box";
import { useOrganizerStore } from "@/components/organizer-store";

const tabs = [
  { label: "Home", href: "/", icon: House },
  { label: "Library", href: "/library", icon: Archive },
  { label: "Reminders", href: "/reminders", icon: CalendarDays },
  { label: "Money", href: "/expenses", icon: ReceiptText },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { storageError, retryStorage } = useOrganizerStore();

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-64 shrink-0 border-r border-white/[0.08] bg-[#171617] px-5 py-7 md:flex md:flex-col">
        <Link href="/" className="flex items-center gap-3 px-2">
          <span className="grid size-10 place-items-center rounded-2xl bg-[#35496d] text-lg font-semibold text-[#c5d5f3]">
            m
          </span>
          <span className="text-[17px] font-medium tracking-tight text-[#f4f0e9]">myspace</span>
        </Link>

        <nav aria-label="Main navigation" className="mt-12 space-y-1">
          {tabs.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${
                  active
                    ? "bg-[#35496d]/50 font-medium text-[#e2eafb]"
                    : "text-[#aaa7a4] hover:bg-white/[0.05] hover:text-[#f4f0e9]"
                }`}
              >
                <Icon size={18} strokeWidth={1.8} />
                {label}
              </Link>
            );
          })}
        </nav>

      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-[64px] shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#171617]/90 px-5 backdrop-blur sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-2 md:hidden">
            <span className="grid size-8 place-items-center rounded-xl bg-[#35496d] font-semibold text-[#c5d5f3]">
              m
            </span>
            <span className="text-sm font-medium text-[#f4f0e9]">myspace</span>
          </Link>
          <span className="text-xs text-[#969190] sm:text-sm">Your organizer</span>
        </header>

        {storageError && (
          <div
            aria-live="assertive"
            className="mx-auto mt-4 flex w-full max-w-6xl items-center gap-3 rounded-xl border border-[#8a514c]/40 bg-[#492a2a]/40 px-4 py-3 text-sm text-[#f0d7d2]"
            role="alert"
          >
            <p className="min-w-0 flex-1">{storageError}</p>
            <button
              className="min-h-9 shrink-0 rounded-full border border-white/15 px-3 text-xs hover:bg-white/[0.08]"
              onClick={retryStorage}
              type="button"
            >
              Retry
            </button>
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-[calc(18rem+env(safe-area-inset-bottom))] pt-8 sm:px-8 sm:pt-12 md:pb-44 lg:px-12">
          {children}
        </main>

        <nav
          aria-label="Main navigation"
          className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-white/[0.08] bg-[#171617]/95 px-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 backdrop-blur md:hidden"
        >
          {tabs.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] ${
                  active ? "font-medium text-[#c5d5f3]" : "text-[#898487]"
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2 : 1.7} />
                {label}
              </Link>
            );
          })}
        </nav>
        <CaptureBox />
      </div>
    </div>
  );
}
