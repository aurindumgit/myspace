"use client";

import { CalendarDays } from "lucide-react";

function toDateTimeLocal(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function ReminderDateTimePicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value: string | undefined) => void;
}) {
  const localValue = toDateTimeLocal(value);
  const date = localValue.slice(0, 10);
  const time = localValue.slice(11, 16) || "09:00";

  function updateDate(nextDate: string) {
    if (!nextDate) {
      onChange(undefined);
      return;
    }
    onChange(new Date(`${nextDate}T${time}`).toISOString());
  }

  function updateTime(nextTime: string) {
    if (!date || !nextTime) return;
    onChange(new Date(`${date}T${nextTime}`).toISOString());
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
      <label className="block space-y-1.5 text-xs text-[#aaa6a4]">
        Date
        <span className="relative flex min-h-12 items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#211f21] px-3 text-sm text-[#f4f0e9] focus-within:border-[#9fb5e3]/60">
          <span className={date ? "" : "text-[#969190]"}>
            {date ? formatDate(date) : "Choose a date"}
          </span>
          <CalendarDays aria-hidden="true" className="shrink-0 text-[#9fb5e3]" size={17} />
          <input
            aria-label="Choose reminder date"
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            onChange={(event) => updateDate(event.target.value)}
            type="date"
            value={date}
          />
        </span>
      </label>
      <label className="block space-y-1.5 text-xs text-[#aaa6a4]">
        Time
        <input
          aria-label="Choose reminder time"
          className="min-h-12 w-full rounded-xl border border-white/10 bg-[#211f21] px-2 text-sm text-[#f4f0e9] outline-none color-scheme-dark focus:border-[#9fb5e3]/60 disabled:text-[#969190]"
          disabled={!date}
          onChange={(event) => updateTime(event.target.value)}
          type="time"
          value={time}
        />
      </label>
    </div>
  );
}
