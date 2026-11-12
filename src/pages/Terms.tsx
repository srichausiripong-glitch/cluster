import { th } from '../copy/th'
import { Logo } from '../design/Logo'

export function Terms() {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 p-4 md:p-6">
      <Logo size={18} />
      <h1 className="text-[24px] font-bold">{th.terms.title}</h1>
      <p className="box p-4 font-semibold">{th.terms.unverified}</p>
      <ul className="box list-disc space-y-1 p-4 pl-8">
        {th.terms.items.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </main>
  )
}
