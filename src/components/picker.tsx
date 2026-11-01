"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, options.findIndex((option) => option.value === value)),
  );
  const id = useId();
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  function moveActive(index: number) {
    if (!options.length) return;
    setActiveIndex((index + options.length) % options.length);
  }

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
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          if (!open) {
            setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)));
            setOpen(true);
          } else {
            moveActive(activeIndex + 1);
          }
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          if (!open) {
            setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)));
            setOpen(true);
          } else {
            moveActive(activeIndex - 1);
          }
        } else if (open && event.key === "Home") {
          event.preventDefault();
          setActiveIndex(0);
        } else if (open && event.key === "End") {
          event.preventDefault();
          setActiveIndex(options.length - 1);
        } else if (event.key === "Tab") {
          setOpen(false);
        }
      }}
      ref={pickerRef}
    >
      <button
        aria-activedescendant={
          open && options[activeIndex] ? `${id}-option-${activeIndex}` : undefined
        }
        aria-controls={`${id}-list`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#211f21] px-3.5 py-3 text-left text-sm text-[#f4f0e9] outline-none transition hover:border-white/20 focus:border-[#9fb5e3]/60"
        onClick={() => {
          setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)));
          setOpen((current) => !current);
        }}
        ref={triggerRef}
        role="combobox"
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
          id={`${id}-list`}
          role="listbox"
        >
          {options.map((option, index) => (
            <button
              aria-selected={value === option.value}
              className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                value === option.value
                  ? "bg-[#35496d] text-[#f4f0e9]"
                  : index === activeIndex
                    ? "bg-white/[0.1] text-[#f4f0e9]"
                    : "text-[#d7d2ce] hover:bg-white/[0.07]"
              } focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9fb5e3] focus-visible:outline-offset-1`}
              id={`${id}-option-${index}`}
              key={option.value}
              onFocus={() => setActiveIndex(index)}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              role="option"
              tabIndex={-1}
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
