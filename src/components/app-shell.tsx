"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, CalendarDays, House, ReceiptText } from "lucide-react";
import { CaptureBox } from "@/components/capture-box";

const tabs = [
  { label: "Home", href: "/", icon: House },
  { label: "Library", href: "/library", icon: Archive },
  { label: "Reminders", href: "/reminders", icon: CalendarDays },
  { label: "Money", href: "/expenses", icon: ReceiptText },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-64 shrink-0 border-r border-white/[0.08] bg-[#171617] px-5 py-7 md:flex md:flex-col">
        <Link href="/" className="flex items-center gap-3 px-2">
          <span className="grid size-10 place-items-center rounded-2xl bg-[#35496d] text-lg font-semibold text-[#c5d5f3]">
            c
          </span>
          <span className="text-[17px] font-medium tracking-tight text-[#f4f0e9]">commonplace</span>
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

        <div className="mt-auto rounded-2xl border border-white/[0.08] bg-[#1d1b1c] p-4">
          <p className="text-sm font-medium text-[#e7e3df]">A little space for everything.</p>
          <p className="mt-1 text-xs leading-5 text-[#969190]">
            Your personal organizer, kept simple.
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-[64px] shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#171617]/90 px-5 backdrop-blur sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-2 md:hidden">
            <span className="grid size-8 place-items-center rounded-xl bg-[#35496d] font-semibold text-[#c5d5f3]">
              c
            </span>
            <span className="text-sm font-medium text-[#f4f0e9]">commonplace</span>
          </Link>
          <span className="hidden text-sm text-[#969190] md:block">
            Your personal space
          </span>
          <span className="text-xs text-[#969190] sm:text-sm">Your organizer</span>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-56 pt-8 sm:px-8 sm:pt-12 md:pb-44 lg:px-12">
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
