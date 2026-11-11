import { th } from '../copy/th'
import { K } from '../domain/publication'

/** Per-clinic figures under the threshold are shown as words, not numbers (spec 5.4). */
export const underK = (n: number): string => (n < K ? th.clinic.underK : String(n))
