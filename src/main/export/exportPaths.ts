/**
 * Helper to extract the file extension from a path, preserving case.
 * Returns empty string if no extension is found.
 */
export function getFileExtension(filePath: string): string {
  const parts = filePath.split(/[/\\]/)
  const fileName = parts[parts.length - 1] || ''
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex <= 0) return ''
  return fileName.slice(dotIndex + 1)
}

/**
 * Pads a question number with leading zeros up to 3 digits (e.g. 1 -> "001").
 */
export function padQuestionNo(questionNo: number): string {
  return String(questionNo).padStart(3, '0')
}

/**
 * Normalizes backslashes to forward slashes.
 */
export function normalizePathSlashes(pathStr: string): string {
  return pathStr.replace(/\\/g, '/')
}

/**
 * Question music path builder:
 * music/questions/stage<stageNo>_q<questionNo padded to 3>.<original ext>
 */
export function getQuestionMusicRelativePath(stageNo: number, questionNo: number, originalPath: string): string {
  const ext = getFileExtension(originalPath)
  const padded = padQuestionNo(questionNo)
  const suffix = ext ? `.${ext}` : ''
  return normalizePathSlashes(`music/questions/stage${stageNo}_q${padded}${suffix}`)
}

/**
 * Answer music path builder:
 * music/answers/stage<stageNo>_q<questionNo padded to 3>_answer.<original ext>
 */
export function getAnswerMusicRelativePath(stageNo: number, questionNo: number, originalPath: string): string {
  const ext = getFileExtension(originalPath)
  const padded = padQuestionNo(questionNo)
  const suffix = ext ? `.${ext}` : ''
  return normalizePathSlashes(`music/answers/stage${stageNo}_q${padded}_answer${suffix}`)
}

/**
 * Image path builder:
 * images/stage<stageNo>_q<questionNo padded to 3>.<original ext>
 */
export function getPictureRelativePath(stageNo: number, questionNo: number, originalPath: string): string {
  const ext = getFileExtension(originalPath)
  const padded = padQuestionNo(questionNo)
  const suffix = ext ? `.${ext}` : ''
  return normalizePathSlashes(`images/stage${stageNo}_q${padded}${suffix}`)
}
