/** Calendar export with a neutral title, so a shared calendar shows nothing about health (spec 5.5). */
export function buildIcs(events: { date: string; title?: string }[]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//prototype//TH']
  events.forEach((event, i) => {
    const day = event.date.replace(/-/g, '')
    lines.push('BEGIN:VEVENT', `UID:${day}-${i}@local`, `DTSTART;VALUE=DATE:${day}`, `SUMMARY:${event.title ?? 'นัดหมาย'}`, 'END:VEVENT')
  })
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}
