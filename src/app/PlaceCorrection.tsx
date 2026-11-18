import { useId, useState } from 'react'
import { th } from '../copy/th'
import { Emoji } from '../design/Emoji'
import { NOTE, SOFT, TEXT_LINK } from '../design/look'
import { Button } from '../design/primitives/Button'
import { PHONE_KINDS, PLACE_KINDS, sendPlaceReport, thaiPhone, type PlaceKind } from './placeReport'

/**
 * "ข้อมูลไม่ตรง?" under a place's details (2026-11-18 design, decision 4): one fixed kind, and the
 * place's number only for the two phone kinds. The team calls before changing anything.
 */
export function PlaceCorrection({ place }: { place: string }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<PlaceKind | null>(null)
  const [phone, setPhone] = useState('')
  const [result, setResult] = useState<'sent' | 'failed' | null>(null)
  const [sending, setSending] = useState(false)
  const name = useId()
  const phoneId = useId()
  const takesPhone = kind !== null && PHONE_KINDS.includes(kind)
  const digits = takesPhone ? thaiPhone(phone) : null
  const ready = kind !== null && (!takesPhone || digits !== null) && !sending

  if (result === 'sent')
    return (
      <p role="status" className={`mt-3 flex items-center gap-2 px-3 py-2 text-[14px] font-semibold ${SOFT}`}>
        <Emoji name="check" />
        {th.placeReport.thanks}
      </p>
    )
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className={`mt-2 inline-flex min-h-11 items-center text-[14px] ${TEXT_LINK}`}>
        {th.placeReport.open}
      </button>
    )

  const send = async () => {
    if (!ready || kind === null) return
    setSending(true)
    const ok = await sendPlaceReport(place, kind, digits ?? undefined)
    setSending(false)
    setResult(ok ? 'sent' : 'failed')
  }
  return (
    <fieldset className={`mt-3 space-y-2 p-3 ${NOTE}`}>
      <legend className="px-1 font-bold">{th.placeReport.title}</legend>
      {PLACE_KINDS.map((k) => (
        <label key={k} className="flex min-h-11 items-center gap-2">
          <input type="radio" name={name} value={k} checked={kind === k} onChange={() => setKind(k)} className="size-5 accent-ink" />
          {th.placeReport.kinds[k]}
        </label>
      ))}
      {takesPhone && (
        <div className="space-y-1">
          <label htmlFor={phoneId} className="block text-[14px] font-semibold">
            {th.placeReport.phone}
          </label>
          <input id={phoneId} type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} className="min-h-11 w-full rounded-md border-2 border-ink bg-surface px-3" />
          <p className="text-[13px] text-muted">{th.placeReport.phoneHint}</p>
        </div>
      )}
      {result === 'failed' && <p className="text-[14px]">{th.placeReport.failed}</p>}
      <Button className="w-full" disabled={!ready} onClick={send}>
        {th.placeReport.send}
      </Button>
      <p className="text-[13px] text-muted">{th.placeReport.note}</p>
    </fieldset>
  )
}
