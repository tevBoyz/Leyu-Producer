/** Lowercase, URL/file-safe slug with hyphens (for episode zip names). */
export function slugifyTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Normalize manual slug input to the same rules. */
export function normalizeSlug(input: string): string {
  return slugifyTitle(input.replace(/-/g, ' '))
}
