// Downloads the emoji pictures the app shows into src/design/emoji (committed): OpenMoji 15.1.0
// colour SVGs, unmodified, CC BY-SA 4.0 (credit on the help page and in src/design/emoji/LICENSE.md).
// The app serves its own copies; no phone ever asks another site for them. Run: npm run emoji:fetch
import { writeFile } from 'node:fs/promises'
import { CODES } from '../../src/design/emojiCodes.ts'

const SOURCE = 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/15.1.0/color/svg/'
const OUT = new URL('../../src/design/emoji/', import.meta.url)
const headers = { 'User-Agent': 'emoji-fetch/1.0' }

for (const code of Object.values(CODES)) {
  const res = await fetch(`${SOURCE}${code}.svg`, { headers, signal: AbortSignal.timeout(30000) })
  if (res.status !== 200) throw new Error(`${code}: ${res.status}`)
  const body = await res.text()
  if (!body.trimStart().startsWith('<svg')) throw new Error(`${code}: not an SVG`)
  await writeFile(new URL(`${code}.svg`, OUT), body)
  console.log(`${code}.svg ${body.length} B`)
}
