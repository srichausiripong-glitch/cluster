import { Radio } from 'lucide-react'
import { Link } from 'react-router-dom'
import { th } from '../copy/th'
import { useEmbedTo } from './embed'

/** The send-signal button, the same on the map and on the list: a pink pill that sends out two slow rings. */
export function SendSignalLink({ className = '' }: { className?: string }) {
  const to = useEmbedTo()
  return (
    <Link
      to={to('/app/report')}
      className={`ripple inline-flex min-h-14 items-center gap-2 rounded-full border-[2.5px] border-ink bg-care px-5 text-[17px] font-bold text-ink shadow-pop-lg transition-[transform,box-shadow] duration-75 active:translate-x-[5px] active:translate-y-[5px] active:shadow-none ${className}`}
    >
      <Radio size={22} strokeWidth={2} aria-hidden="true" />
      {th.report.cta}
    </Link>
  )
}
