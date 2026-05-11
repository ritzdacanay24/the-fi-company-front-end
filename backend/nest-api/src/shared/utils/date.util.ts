/** Convert ISO 8601 / any Date-parseable string to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS) */
export function toMysqlDatetime(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/** Convert ISO 8601 / any Date-parseable string to MySQL DATE format (YYYY-MM-DD) */
export function toMysqlDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Parse YYYY-MM-DD as a local calendar date (no UTC shift). */
export function parseDateOnly(value: string | null | undefined): Date | null {
  const normalized = String(value || '').trim();
  if (!normalized) return null;

  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, monthIndex, day);

  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== monthIndex
    || parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

/** Parse date input safely, preferring local calendar parsing for YYYY-MM-DD. */
export function parseDateInput(value: string | null | undefined): Date | null {
  const normalized = String(value || '').trim();
  if (!normalized) return null;

  const dateOnly = parseDateOnly(normalized);
  if (dateOnly) return dateOnly;

  const parsed = new Date(normalized);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}
