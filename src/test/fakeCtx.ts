/** A stand-in for a canvas context: it draws nothing and remembers what it was asked to draw. */
export interface FakeCtx {
  calls: { name: string; args: unknown[] }[]
  sets: { prop: string; value: unknown }[]
  ctx: CanvasRenderingContext2D
}

/** Records every call and every property set; `measureText` answers 6 px a character. */
export function fakeCtx(): FakeCtx {
  const calls: FakeCtx['calls'] = []
  const sets: FakeCtx['sets'] = []
  const values = new Map<string, unknown>()
  const ctx = new Proxy(
    {},
    {
      get(_target, prop) {
        const name = String(prop)
        if (values.has(name)) return values.get(name)
        return (...args: unknown[]) => {
          calls.push({ name, args })
          return name === 'measureText' ? { width: String(args[0]).length * 6 } : undefined
        }
      },
      set(_target, prop, value) {
        sets.push({ prop: String(prop), value })
        values.set(String(prop), value)
        return true
      },
    },
  ) as unknown as CanvasRenderingContext2D
  return { calls, sets, ctx }
}
