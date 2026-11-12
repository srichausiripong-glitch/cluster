import { th } from '../copy/th'
import { Logo } from '../design/Logo'

/** The privacy notice (v1 spec 2.7, 4.4): what leaves the phone, what is kept, and what Vercel keeps. */
export function Privacy() {
  const controller = import.meta.env.VITE_CONTROLLER_NAME as string | undefined
  const contact = import.meta.env.VITE_CONTACT_EMAIL as string | undefined
  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 p-4 md:p-6">
      <Logo size={18} />
      <h1 className="text-[24px] font-bold">{th.privacy.title}</h1>
      <section className="box space-y-1 p-4">
        <p>
          <span className="font-bold">{th.privacy.controller}: </span>
          {controller || th.privacy.unset}
        </p>
        <p>
          <span className="font-bold">{th.privacy.contact}: </span>
          {contact ? (
            <a href={`mailto:${contact}`} className="underline underline-offset-4">
              {contact}
            </a>
          ) : (
            th.privacy.unset
          )}
        </p>
      </section>
      <section className="box p-4">
        <h2 className="mb-2 font-bold">{th.privacy.leavesTitle}</h2>
        <ul className="list-disc space-y-1 pl-5">
          {th.privacy.leaves.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
      <section aria-label={th.privacy.serverKeeps} className="box p-4">
        <h2 className="mb-2 font-bold">{th.privacy.serverKeeps}</h2>
        <ul className="list-disc space-y-1 pl-5">
          {th.privacy.kept.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-2 font-semibold">{th.privacy.notKept}</p>
      </section>
      <p className="box p-4">{th.privacy.operatorSees}</p>
      <p className="box p-4">{th.privacy.vercelLogs}</p>
      <section className="box p-4">
        <h2 className="mb-2 font-bold">{th.privacy.phoneTitle}</h2>
        <p>{th.privacy.phone}</p>
      </section>
      <section className="box p-4">
        <h2 className="mb-2 font-bold">{th.privacy.rightsTitle}</h2>
        <p>{th.privacy.rights}</p>
      </section>
    </main>
  )
}
