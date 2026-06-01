/** Basename without importing Node path in the renderer. */
export function displayFileName(filePath: string): string {
  if (!filePath.trim()) return ''
  const normalized = filePath.replace(/\\/g, '/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || filePath
}
