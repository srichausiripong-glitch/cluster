/** A page that later tasks of the v1 plan fill in. It only names itself. */
export function Placeholder({ title }: { title: string }) {
  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <h1 className="text-[24px] font-bold">{title}</h1>
    </main>
  )
}
