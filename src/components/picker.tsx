"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type PickerOption = {
  value: string;
  label: string;
};

export function Picker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: PickerOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    function handleOutsideClick(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    return () => document.removeEventListener("pointerdown", handleOutsideClick);
  }, []);

  return (
    <div
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
      ref={pickerRef}
    >
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#211f21] px-3.5 py-3 text-left text-sm text-[#f4f0e9] outline-none transition hover:border-white/20 focus:border-[#9fb5e3]/60"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="truncate">{selected?.label ?? label}</span>
        <ChevronDown
          className={`shrink-0 text-[#aaa6a4] transition-transform ${open ? "rotate-180" : ""}`}
          size={16}
        />
      </button>
      {open && (
        <div
          aria-label={label}
          className="absolute inset-x-0 top-full z-[60] mt-2 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-[#242225] p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
          role="listbox"
        >
          {options.map((option) => (
            <button
              aria-selected={value === option.value}
              className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                value === option.value
                  ? "bg-[#35496d] text-[#f4f0e9]"
                  : "text-[#d7d2ce] hover:bg-white/[0.07]"
              }`}
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              role="option"
              type="button"
            >
              <span className="truncate">{option.label}</span>
              {value === option.value && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
