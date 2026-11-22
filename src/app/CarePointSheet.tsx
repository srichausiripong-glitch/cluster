import { CalendarCheck, ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatThaiDay } from '../copy/format'
import { th } from '../copy/th'
import { Emoji } from '../design/Emoji'
import { ALERT, QUIET_LINK, TEXT_LINK } from '../design/look'
import { Chip } from '../design/primitives/Chip'
import { Sheet } from '../design/primitives/Sheet'
import { isVerified, type CarePoint } from '../data/carePoints'
import { districtLabel } from '../domain/districts'
import { carePointType } from './CarePointRow'
import { hoursLine } from './hoursText'
import { PlaceCorrection } from './PlaceCorrection'

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

/** How else to reach a place, as its public list gives it (2026-11-18 design, decision 1). Nothing when it has none. */
function ContactRow({ point }: { point: CarePoint }) {
  const lineUrl = point.line && (point.line.startsWith('@') ? `https://line.me/R/ti/p/${point.line}` : point.line)
  type Link = { label: string; href: string; outside: boolean }
  const links = (
    [
    point.email && { label: th.care.email, href: `mailto:${point.email}`, outside: false },
    point.website && { label: th.care.website, href: point.website, outside: true },
    point.facebook && { label: th.care.facebook, href: point.facebook, outside: true },
    lineUrl && { label: th.care.line, href: lineUrl, outside: true },
    ] as (Link | '' | undefined)[]
  ).filter((link): link is Link => Boolean(link))
  if (links.length === 0) return null
  return (
    <Row
      label={th.care.contact}
      value={
        <span className="flex flex-wrap gap-x-4">
          {links.map((link) => (
            <a key={link.label} href={link.href} {...(link.outside ? { target: '_blank', rel: 'noreferrer' } : {})} className={`inline-flex min-h-11 items-center ${TEXT_LINK}`}>
              {link.label}
            </a>
          ))}
        </span>
      }
    />
  )
}

/** The name of the site a point's data came from, as a link reads it. */
const host = (url: string) => {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

/** Whether the place is open, which hours they are and where they come from (2026-11-18 design, decision 3). */
function HoursRow({ point }: { point: CarePoint }) {
  const line = hoursLine(point.open)
  return (
    <Row
      label={point.openKind === 'service' ? th.hours.service : th.hours.office}
      value={
        line ? (
          <>
            <span className="block font-semibold">{line}</span>
            <span className="block text-[13px] text-muted">{th.hours.holidays}</span>
            {point.openSource && (
              <span className="flex flex-wrap items-center gap-x-1 text-[13px]">
                {th.hours.from}
                <a href={point.openSource} target="_blank" rel="noreferrer" className={`inline-flex min-h-11 items-center gap-1 break-all ${TEXT_LINK}`}>
                  {host(point.openSource)}
                  <ExternalLink size={14} strokeWidth={2} className="shrink-0" aria-hidden="true" />
                </a>
              </span>
            )}
          </>
        ) : (
          th.hours.unknown
        )
      }
    />
  )
}

/** Where a number found on another page came from, so a person can check it (owner, 18 Nov 2026). */
function PhoneFrom({ point }: { point: CarePoint }) {
  if (!point.phone || (!point.phoneSource && !point.phoneConfirmed)) return null
  return (
    <Row
      label={th.care.phoneFrom}
      value={
        point.phoneSource ? (
          <a href={point.phoneSource} target="_blank" rel="noreferrer" className={`inline-flex min-h-11 items-center gap-1.5 break-all ${TEXT_LINK}`}>
            {host(point.phoneSource)}
            <ExternalLink size={16} strokeWidth={2} className="shrink-0" aria-hidden="true" />
          </a>
        ) : (
          th.care.phoneConfirmed.replace('{date}', formatThaiDay(point.phoneConfirmed!.date))
        )
      }
    />
  )
}

/**
 * One care point. A confirmed place shows its full detail; a place nobody has confirmed says to
 * call first, where its data came from and when, and none of the detail it cannot vouch for
 * (redesign spec 5.8). Both offer a call when a number is known, and the way there, which opens
 * Google Maps with the place's coordinates only when pressed (plan decision 9; /privacy says so).
 */
export function CarePointSheet({ point, onClose }: { point: CarePoint | null; onClose: () => void }) {
  if (!point) return null
  const verified = isVerified(point)
  return (
    <Sheet open onClose={onClose} title={point.name}>
      <div className="mb-3 flex flex-wrap gap-2">
        <Chip tone="care">{carePointType(point)}</Chip>
        {verified && point.pep && <Chip tone="care">{th.care.pep}</Chip>}
      </div>
      {verified ? (
        <>
          <dl className="space-y-2 rounded-md border-2 border-ink bg-bg p-3 text-[15px]">
            <Row label={th.care.place} value={districtLabel(point.districtId)} />
            {point.klass === 'A' && (
              <>
                {point.services && <Row label={th.care.services} value={point.services.join(' · ')} />}
                {point.hours && <Row label={th.care.hours} value={point.hours} />}
                {point.cost && <Row label={th.care.cost} value={<Chip tone="free">{point.cost}</Chip>} />}
              </>
            )}
            {point.verified && <Row label={th.care.verified} value={formatThaiDay(point.verified.date)} />}
            <PhoneFrom point={point} />
            <ContactRow point={point} />
            <HoursRow point={point} />
          </dl>
          {point.klass === 'B' && (
            <div className="mt-3 space-y-2 rounded-md border-2 border-ink bg-bg p-3">
              <p className="text-muted">{th.care.klassBNote}</p>
              <a href={point.source} target="_blank" rel="noreferrer" className={`inline-flex min-h-11 items-center gap-2 ${TEXT_LINK}`}>
                <ExternalLink size={18} strokeWidth={2} aria-hidden="true" />
                {th.care.linkOut}
              </a>
            </div>
          )}
        </>
      ) : (
        <>
          <p className={`mb-3 flex items-center gap-2 px-3 py-2 font-bold ${ALERT}`}>
            {/* Never "call first" where there is no number to call (owner, 18 Nov 2026). */}
            <Emoji name={point.phone ? 'phone' : 'search'} />
            {point.phone ? th.care.unverified : th.care.unverifiedMaps}
          </p>
          <dl className="space-y-2 rounded-md border-2 border-ink bg-bg p-3 text-[15px]">
            <Row
              label={th.care.place}
              value={
                <>
                  {districtLabel(point.districtId)}
                  {point.address && <span className="block text-[14px] text-muted">{point.address}</span>}
                </>
              }
            />
            <Row
              label={th.care.source}
              value={
                <a href={point.source} target="_blank" rel="noreferrer" className={`inline-flex min-h-11 items-center gap-1.5 break-all ${TEXT_LINK}`}>
                  {host(point.source)}
                  <ExternalLink size={16} strokeWidth={2} className="shrink-0" aria-hidden="true" />
                </a>
              }
            />
            <PhoneFrom point={point} />
            <ContactRow point={point} />
            <HoursRow point={point} />
          </dl>
          <p className="mt-2 text-[13px] text-muted">{th.care.fetched.replace('{date}', formatThaiDay(point.fetched))}</p>
        </>
      )}
      {/* Booking happens on the partner's own site, opened only when pressed; nothing about the person goes with it. */}
      {point.booking && (
        <a href={point.booking} target="_blank" rel="noreferrer" className={`mt-3 w-full ${QUIET_LINK}`}>
          <CalendarCheck size={18} strokeWidth={2} aria-hidden="true" />
          <span>
            {th.care.booking} <span className="font-normal text-muted">· {host(point.booking)}</span>
          </span>
        </a>
      )}
      <PlaceCorrection key={point.id} place={point.id} />
      {/* Kept at the foot of the sheet, so a short screen still shows how to call first and the way there. */}
      <div className="sticky -bottom-6 -mx-4 -mb-6 mt-3 flex gap-2 border-t-2 border-ink bg-surface px-4 pb-7 pt-2">
        {point.phone ? (
          <a href={`tel:${point.phone}`} className={`flex-1 ${QUIET_LINK}`}>
            <Emoji name="phone" />
            {th.care.call}
          </a>
        ) : (
          // No number is known: Google's listing of the place usually has one (2026-11-18 design, decision 1).
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${point.name} ${point.lat},${point.lon}`)}`} target="_blank" rel="noreferrer" className={`flex-auto whitespace-nowrap ${QUIET_LINK}`}>
            <Emoji name="search" />
            {th.care.googleMaps}
          </a>
        )}
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lon}`} target="_blank" rel="noreferrer" className={`flex-1 ${QUIET_LINK}`}>
          <Emoji name="compass" />
          {th.care.directions}
        </a>
      </div>
    </Sheet>
  )
}
