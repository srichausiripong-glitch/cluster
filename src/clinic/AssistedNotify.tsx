import { useState } from 'react'
import { th } from '../copy/th'
import { Button } from '../design/primitives/Button'
import { Card } from '../design/primitives/Card'
import { acceptSlip } from '../store/actions'

/** The hand-off for clinic-assisted notification. Contact details never enter this system (spec 5.5). */
export function AssistedNotify() {
  const [text, setText] = useState('')
  const [state, setState] = useState<'idle' | 'ok' | 'bad'>('idle')
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-[24px] font-semibold">{th.clinic.nav.assist}</h1>
      <Card>
        <label htmlFor="slip" className="mb-1 block text-[13px] font-medium text-muted">
          {th.clinic.slipInput}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="slip"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setState('idle')
            }}
            autoComplete="off"
            className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-bg px-3 text-[17px] font-semibold uppercase tracking-widest"
          />
          <Button disabled={text.trim() === ''} onClick={() => setState(acceptSlip(text) ? 'ok' : 'bad')}>
            {th.clinic.slipCheck}
          </Button>
        </div>
        {state === 'ok' && (
          <p role="status" className="mt-3 rounded-md bg-care-soft px-3 py-2 font-medium">
            {th.clinic.slipOk}
          </p>
        )}
        {state === 'bad' && (
          <p role="alert" className="mt-3 font-medium">
            {th.clinic.slipBad}
          </p>
        )}
      </Card>
      <p className="rounded-md border border-dashed border-muted p-3 text-[13px]">{th.clinic.assistNote}</p>
    </div>
  )
}
