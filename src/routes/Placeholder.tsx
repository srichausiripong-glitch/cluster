import { Wordmark } from '../design/Wordmark'

export function Placeholder({ title }: { title: string }) {
  return (
    <main className="mx-auto max-w-xl p-6">
      <Wordmark />
      <h1 className="mt-4 text-[24px] font-semibold">{title}</h1>
      <p className="text-muted">หน้านี้กำลังสร้าง</p>
    </main>
  )
}
