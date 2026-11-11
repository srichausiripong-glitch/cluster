import { Building2, Globe, Server, Smartphone } from 'lucide-react'
import { th } from '../copy/th'
import type { Party } from '../domain/types'

const STYLE = {
  phone: { icon: Smartphone, cls: 'bg-care text-ink' },
  clinic: { icon: Building2, cls: 'bg-yellow text-ink' },
  operator: { icon: Server, cls: 'bg-leaf text-ink' },
  public: { icon: Globe, cls: 'bg-surface text-ink' },
} as const

/** Names the party in words and with an icon, so the colour is never the only cue. */
export function PartyTag({ party }: { party: Party }) {
  const { icon: Icon, cls } = STYLE[party]
  return (
    <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border-[1.5px] border-ink px-2.5 text-[13px] font-medium ${cls}`}>
      <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
      {th.data.party[party]}
    </span>
  )
}
