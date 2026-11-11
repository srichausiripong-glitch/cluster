import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { th } from '../copy/th'
import { Button } from '../design/primitives/Button'
import { Card } from '../design/primitives/Card'
import { issueClinicCode } from '../store/actions'

export function IssueCode() {
  const [code, setCode] = useState<string | null>(null)
  return (
    <div className="space-y-4">
      <h1 className="text-[24px] font-semibold">{th.clinic.nav.issue}</h1>
      <p className="text-muted">{th.clinic.issueNote}</p>
      <Button size="lg" onClick={() => setCode(issueClinicCode())}>
        {th.clinic.issue}
      </Button>
      {code && (
        <Card className="step-in flex flex-wrap items-center gap-5">
          <div className="rounded-md bg-white p-2">
            <QRCodeSVG value={code} size={132} fgColor="#14282e" />
          </div>
          <p className="text-[32px] font-semibold tracking-[0.25em]">{code}</p>
        </Card>
      )}
    </div>
  )
}
