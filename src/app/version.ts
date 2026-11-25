/** The module script a page of the app loads: its file name changes with every build. */
export function moduleSrc(html: string): string | null {
  const tag = html.match(/<script\b[^>]*type="module"[^>]*>/i)?.[0]
  return tag?.match(/\bsrc="([^"]+)"/)?.[1] ?? null
}

/**
 * Reloads a tab opened before the version the server now serves, so an old tab does not keep drawing
 * the map by old rules (deferred minor, traffic-light review). Does nothing offline or when current.
 */
export async function reloadIfNewVersion(reload: () => void = () => location.reload()): Promise<boolean> {
  const mine = document.querySelector('script[type="module"][src]')?.getAttribute('src') ?? null
  if (!mine) return false
  try {
    const served = moduleSrc(await (await fetch('/', { cache: 'no-store' })).text())
    if (!served || served === mine) return false
  } catch {
    return false
  }
  reload()
  return true
}
