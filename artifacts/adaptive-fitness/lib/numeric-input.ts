export interface NumericOptions {
  min: number;
  max: number;
  optional?: boolean;
  decimals?: boolean;
  clamp?: boolean;
}

/** Parse on every edit, not on blur: a Save tap must see the displayed target. */
export function numericValue(text: string, options: NumericOptions): number | undefined {
  const t = text.replace(',', '.').trim();
  if (!t) return options.optional ? undefined : options.min;
  if (!/^\d*(?:\.\d*)?$/.test(t)) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n)) return undefined;
  const rounded = options.decimals ? Math.round(n * 100) / 100 : Math.round(n);
  // A partial prefix (e.g. "4" while entering "40") must not become "5".
  // Planning/execution validation rejects out-of-range targets on save.
  return options.clamp ? Math.max(options.min, Math.min(options.max, rounded)) : rounded;
}
