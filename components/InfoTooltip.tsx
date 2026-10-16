"use client";

import { Info } from "lucide-react";
import { useId } from "react";

/** A small "(i)" affordance that reveals the formula/rule behind a stat on hover, focus or tap —
 *  keeps the UI clean by default while still making every number's math inspectable. */
export default function InfoTooltip({ text }: { text: string }) {
  const id = useId();

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label="How this is calculated"
        aria-describedby={id}
        className="grid h-6 w-6 place-items-center rounded-full text-text-tertiary transition-colors hover:text-text-primary"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span
        id={id}
        role="tooltip"
        className="glass-strong pointer-events-none invisible absolute right-0 top-7 z-30 w-56 rounded-xl p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-text-secondary opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
