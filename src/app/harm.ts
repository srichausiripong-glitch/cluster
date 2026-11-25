/** The fixed kinds a person may report. No free text, so nothing identifying can be typed in by mistake (spec 3.1, 5.8). */
export const HARM_KINDS = ['violence', 'outed', 'coerced', 'false_notice', 'other'] as const
export type HarmKind = (typeof HARM_KINDS)[number]

/** Sends one harm report. The server keeps a weekly count per kind and nothing else. */
export async function sendHarmReport(kind: HarmKind): Promise<boolean> {
  try {
    const res = await fetch('/api/harm', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind }) })
    return res.ok
  } catch {
    return false
  }
}
