import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[#dcd9cf] bg-[#fbfaf7] px-6 py-12 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eeecf6] text-[#6d64a8]">
        <Icon size={21} strokeWidth={1.7} />
      </span>
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#77756e]">
        {description}
      </p>
    </div>
  );
}
