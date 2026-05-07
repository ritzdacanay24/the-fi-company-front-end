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
