// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { expect, it } from 'vitest'

// Vercel compiles each file in api/ on its own and runs it as an ES module, where a relative import
// without its extension cannot be found (seen as ERR_MODULE_NOT_FOUND in a local `vercel build`).
// Every file a function reaches must therefore import its neighbours as './name.js'.
const root = resolve(__dirname, '..')
const entries = (dir: string): string[] =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? entries(join(dir, e.name)) : [join(dir, e.name)]))

function reached(): Map<string, string[]> {
  const seen = new Map<string, string[]>()
  const queue = entries('api').filter((f) => f.endsWith('.ts'))
  while (queue.length) {
    const file = queue.pop()!
    if (seen.has(file)) continue
    const specs = [...readFileSync(join(root, file), 'utf8').matchAll(/(?:from|import)\s+'(\.{1,2}\/[^']+)'/g)].map((m) => m[1])
    seen.set(file, specs)
    for (const s of specs) if (s.endsWith('.js')) queue.push(join(dirname(file), s.replace(/\.js$/, '.ts')))
  }
  return seen
}

it('imports every neighbour a Vercel function reaches with its .js extension', () => {
  const bare: string[] = []
  for (const [file, specs] of reached()) {
    expect(existsSync(join(root, file)), file).toBe(true)
    for (const s of specs) if (!/\.(js|json)$/.test(s)) bare.push(`${file}: ${s}`)
  }
  expect(bare).toEqual([])
})

it('keeps test files out of api/, where each file becomes a deployed function', () => {
  expect(entries('api').filter((f) => /\.test\.ts$/.test(f))).toEqual([])
})
