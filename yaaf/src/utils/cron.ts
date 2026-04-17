/**
 * Cron expression parser and scheduler utilities.
 *
 * Supports standard 5-field cron syntax:
 * minute hour dayOfMonth month dayOfWeek
 * 0-59 0-23 1-31 1-12 0-6 (0=Sun)
 *
 * Field values:
 * * — all values
 * N — single value
 * N-M — range
 * N-M/S — range with step
 * *\/S — every S from min
 * N,M,... — list (comma-separated)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

type CronFields = {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
};

type FieldRange = { min: number; max: number };

const FIELD_RANGES: FieldRange[] = [
  { min: 0, max: 59 }, // minute
  { min: 0, max: 23 }, // hour
  { min: 1, max: 31 }, // dayOfMonth
  { min: 1, max: 12 }, // month
  { min: 0, max: 6 }, // dayOfWeek
];

// ── Internal parsing ──────────────────────────────────────────────────────────

function expandCronField(field: string, range: FieldRange): number[] | null {
  const { min, max } = range;
  const out = new Set<number>();

  for (const part of field.split(",")) {
    const stepMatch = part.match(/^\*(?:\/(\d+))?$/);
    if (stepMatch) {
      const step = stepMatch[1] ? parseInt(stepMatch[1]!, 10) : 1;
      if (step < 1) return null;
      for (let i = min; i <= max; i += step) out.add(i);
      continue;
    }

    const rangeMatch = part.match(/^(\d+)-(\d+)(?:\/(\d+))?$/);
    if (rangeMatch) {
      const lo = parseInt(rangeMatch[1]!, 10);
      const hi = parseInt(rangeMatch[2]!, 10);
      const step = rangeMatch[3] ? parseInt(rangeMatch[3], 10) : 1;
      const isDow = min === 0 && max === 6;
      if (lo > hi || step < 1 || lo < min || hi > (isDow ? 7 : max)) return null;
      for (let i = lo; i <= hi; i += step) out.add(isDow && i === 7 ? 0 : i);
      continue;
    }

    const single = part.match(/^\d+$/);
    if (single) {
      let n = parseInt(part, 10);
      if (min === 0 && max === 6 && n === 7) n = 0;
      if (n < min || n > max) return null;
      out.add(n);
      continue;
    }

    return null;
  }

  if (out.size === 0) return null;
  return Array.from(out).sort((a, b) => a - b);
}

function parseCronExpression(expr: string): CronFields | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const fields: number[][] = [];
  for (let i = 0; i < 5; i++) {
    const expanded = expandCronField(parts[i]!, FIELD_RANGES[i]!);
    if (!expanded) return null;
    fields.push(expanded);
  }
  return {
    minute: fields[0]!,
    hour: fields[1]!,
    dayOfMonth: fields[2]!,
    month: fields[3]!,
    dayOfWeek: fields[4]!,
  };
}

function computeNextCronRun(fields: CronFields, after: Date): Date | null {
  const d = new Date(after.getTime());
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1); // strictly after

  for (let i = 0; i < 366 * 24 * 60; i++) {
    const mo = d.getMonth() + 1;
    const day = d.getDate();
    const dow = d.getDay();
    const hr = d.getHours();
    const min = d.getMinutes();

    if (
      fields.month.includes(mo) &&
      fields.dayOfMonth.includes(day) &&
      fields.dayOfWeek.includes(dow) &&
      fields.hour.includes(hr) &&
      fields.minute.includes(min)
    ) {
      return d;
    }

    d.setMinutes(d.getMinutes() + 1);
  }
  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Validate a 5-field cron expression.
 * @returns true if valid, false otherwise.
 *
 * @example
 * ```ts
 * validateCron('0 9 * * 1-5') // true — 9am weekdays
 * validateCron('61 * * * *') // false — minute out of range
 * ```
 */
export function validateCron(expr: string): boolean {
  return parseCronExpression(expr) !== null;
}

/**
 * Compute the next fire time (epoch ms) after `fromMs` for a given cron expression.
 * Returns `null` if no matching time is found within the next year.
 *
 * @example
 * ```ts
 * const next = nextCronRunMs('0 9 * * *', Date.now())
 * // → epoch ms of next 9am
 * ```
 */
export function nextCronRunMs(cron: string, fromMs: number): number | null {
  const fields = parseCronExpression(cron);
  if (!fields) return null;
  const next = computeNextCronRun(fields, new Date(fromMs));
  return next ? next.getTime() : null;
}

/**
 * Human-readable description of the next fire time, or `null` if invalid.
 *
 * @example
 * ```ts
 * describeCron('0 9 * * 1-5', Date.now())
 * // → 'Next: Mon Apr 14 2026 09:00:00'
 * ```
 */
export function describeCron(cron: string, fromMs = Date.now()): string | null {
  const nextMs = nextCronRunMs(cron, fromMs);
  if (nextMs === null) return null;
  return `Next: ${new Date(nextMs).toString().split(" (")[0]!}`;
}
