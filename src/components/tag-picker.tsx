"use client";

import { useState, type KeyboardEvent } from "react";
import { Plus } from "lucide-react";

export function TagPicker({
  availableTags,
  value,
  onChange,
}: {
  availableTags: string[];
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [newTag, setNewTag] = useState("");

  function addTag() {
    const tag = newTag.trim();
    if (!tag) return;
    const existing = availableTags.find(
      (available) => available.toLowerCase() === tag.toLowerCase(),
    );
    const chosen = existing ?? tag;
    if (!value.some((current) => current.toLowerCase() === chosen.toLowerCase())) {
      onChange([...value, chosen]);
    }
    setNewTag("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-[#aaa6a4]">Tags (optional)</p>
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => {
            const selected = value.some(
              (current) => current.toLowerCase() === tag.toLowerCase(),
            );
            return (
              <button
                aria-pressed={selected}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  selected
                    ? "border-[#9fb5e3]/60 bg-[#35496d]/60 text-[#e2eafb]"
                    : "border-white/10 text-[#aaa7a4] hover:border-white/25"
                }`}
                key={tag}
                onClick={() =>
                  onChange(
                    selected
                      ? value.filter(
                          (current) => current.toLowerCase() !== tag.toLowerCase(),
                        )
                      : [...value, tag],
                  )
                }
                type="button"
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex gap-2">
        <input
          aria-label="Create a tag"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#211f21] px-3 py-2.5 text-sm text-[#f4f0e9] outline-none placeholder:text-[#969190] focus:border-[#9fb5e3]/60"
          onChange={(event) => setNewTag(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a tag"
          value={newTag}
        />
        <button
          aria-label="Add tag"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-[#35496d] text-[#e2eafb] hover:bg-[#425a84]"
          onClick={addTag}
          type="button"
        >
          <Plus size={17} />
        </button>
      </div>
      {value.length === 0 && (
        <p className="text-xs text-[#918d8c]">No tags selected.</p>
      )}
    </div>
  );
}
