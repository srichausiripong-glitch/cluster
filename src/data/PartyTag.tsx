import { Building2, Globe, Server, Smartphone } from 'lucide-react'
import { th } from '../copy/th'
import type { Party } from '../domain/types'

const STYLE = {
  phone: { icon: Smartphone, cls: 'bg-care-soft text-care-ink' },
  clinic: { icon: Building2, cls: 'bg-ink text-white' },
  operator: { icon: Server, cls: 'bg-signal-1 text-signal-edge' },
  public: { icon: Globe, cls: 'border border-line bg-bg text-muted' },
} as const

/** Names the party in words and with an icon, so the colour is never the only cue. */
export function PartyTag({ party }: { party: Party }) {
  const { icon: Icon, cls } = STYLE[party]
  return (
    <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium ${cls}`}>
      <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
      {th.data.party[party]}
    </span>
  )
}
