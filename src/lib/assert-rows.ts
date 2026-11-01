/**
 * Refuse a query result that can't be what was asked for, before it's cached.
 *
 * On 2026-11-01 production cached the archive stats row as the neighborhood
 * list ([{ name: 48, geometryKind: 26 }]): concurrent queries through the
 * Supabase pooler crossed, and /map stayed down until the cache was cleared.
 * Throwing here is the containment: `unstable_cache` never stores a thrown
 * call, so a crossed result costs one failed request, not a day.
 */
export function assertRows<T>(
  rows: ReadonlyArray<T>,
  isValid: (row: T) => boolean,
  label: string,
  { allowEmpty = false }: { allowEmpty?: boolean } = {},
): void {
  if ((rows.length === 0 && !allowEmpty) || !rows.every(isValid)) {
    throw new Error(`${label} query returned an unexpected result (${rows.length} rows)`);
  }
}
