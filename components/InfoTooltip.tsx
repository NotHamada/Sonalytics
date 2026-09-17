"use client";

import { useState } from "react";

/** A small "(i)" affordance that reveals the formula/rule behind a stat on click — keeps the
 *  UI clean by default while still making every number's math inspectable. */
export default function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        aria-label="How this is calculated"
        aria-expanded={open}
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold leading-none text-[var(--text-tertiary)] ring-1 ring-[var(--divider)] transition-colors hover:text-[var(--text-primary)] hover:ring-[var(--text-tertiary)]"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className="glass-pill absolute top-full left-1/2 z-20 mt-2 w-64 -translate-x-1/2 rounded-xl px-3 py-2.5 text-left text-xs font-normal normal-case leading-relaxed text-[var(--text-secondary)] shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}
