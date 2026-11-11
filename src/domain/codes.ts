export type CodeKind = 'clinic' | 'slip' | 'fastTrack' | 'unknown'

/** Three codes look alike on a phone. This tells them apart by shape so an error can say which one was typed. */
export function codeKind(text: string): CodeKind {
  const t = text.trim().toUpperCase()
  if (/^[A-Z]{3}\d{3}$/.test(t)) return 'clinic'
  if (/^S\d{5}$/.test(t)) return 'slip'
  if (/^[A-Z]{2}\d{3}$/.test(t)) return 'fastTrack'
  return 'unknown'
}
