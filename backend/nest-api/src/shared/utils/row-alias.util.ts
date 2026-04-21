export function addLowercaseAliases<T extends Record<string, unknown>>(row: T): T {
  const aliases = Object.entries(row).map(([key, value]) => [key.toLowerCase(), value]);
  return {
    ...Object.fromEntries(aliases),
    ...row,
  } as T;
}
