/** Joins truthy class names. No Tailwind-conflict merging — pass non-overlapping utilities. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
