/**
 * Browse search text helpers — pure, so the client input and the server
 * query share one limit.
 */

/** Search input beyond this many characters is ignored. */
export const MAX_SEARCH_CHARS = 200;

/**
 * Escape LIKE/ILIKE metacharacters so visitor text matches literally.
 * Backslash is Postgres's default LIKE escape character.
 */
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}
