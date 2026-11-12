import { solvePow } from './pow.js'

self.onmessage = async (e: MessageEvent<{ input: string; bits: number }>) => {
  self.postMessage(await solvePow(e.data.input, e.data.bits))
}
