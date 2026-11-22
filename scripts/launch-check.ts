// The gate before a deploy (v1 spec 7.4, redesign spec 5.8): refuses while any care point lacks its
// source or the day it was copied, a confirmed one does not say how it was confirmed, any clinical
// text lacks an https source from a trusted publisher, or a setting the real app needs is missing.   npm run launch-check
import { existsSync, readFileSync } from 'node:fs'
import { CLINICAL } from '../src/copy/clinical.ts'
import { launchCheck } from './launchCheck.ts'

/** Every file of care points that ships: the registry, the BMA's lists and the pharmacies, once they exist. */
const FILES = ['../src/data/care-points.json', '../src/data/bma-health-centres.json', '../src/data/bma-hospitals.json', '../public/care/pharmacies.json']
const read = (path: string): unknown[] => {
  const url = new URL(path, import.meta.url)
  return existsSync(url) ? JSON.parse(readFileSync(url, 'utf8')) : []
}
const carePoints = FILES.flatMap(read) as { id: string; verified: unknown }[]
const reasons = launchCheck(process.env, { carePoints, clinical: Object.values(CLINICAL) })
if (reasons.length) {
  console.error(`Not ready for real users (${reasons.length}):\n- ${reasons.join('\n- ')}`)
  process.exit(1)
}
console.log('Launch check passed.')
