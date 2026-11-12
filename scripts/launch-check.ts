// The gate before a deploy (v1 spec 7.4): refuses while any care point is unverified, any clinical
// text is unsigned, or a setting the real app needs is missing.   npm run launch-check
import { readFileSync } from 'node:fs'
import { CLINICAL } from '../src/copy/clinical.ts'
import { launchCheck } from './launchCheck.ts'

const carePoints = JSON.parse(readFileSync(new URL('../src/data/care-points.json', import.meta.url), 'utf8'))
const reasons = launchCheck(process.env, { carePoints, clinical: Object.values(CLINICAL) })
if (reasons.length) {
  console.error(`Not ready for real users (${reasons.length}):\n- ${reasons.join('\n- ')}`)
  process.exit(1)
}
console.log('Launch check passed.')
