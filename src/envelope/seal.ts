import { pad, unpad, type Plain } from '../domain/envelope.js'

/** A sealed envelope as it travels: the phone's one-time public key, the IV and the sealed content, in base64url. */
export interface Sealed {
  v: 1
  epk: { x: string; y: string }
  iv: string
  ct: string
}

const INFO = new TextEncoder().encode('cluster-envelope-v1')

export function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/** ECDH P-256 with the other side's public key, then HKDF-SHA-256 to an AES-GCM key. */
async function aesKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
  const shared = await crypto.subtle.deriveBits({ name: 'ECDH', public: publicKey }, privateKey, 256)
  const hkdf = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: INFO }, hkdf, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
const importPublic = (jwk: JsonWebKey) => crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y }, { name: 'ECDH', namedCurve: 'P-256' }, false, [])

/** Seals one envelope for the server's public key with a key pair made for this envelope alone. */
export async function seal(plain: Plain, serverJwk: JsonWebKey): Promise<Sealed> {
  const mine = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const key = await aesKey(mine.privateKey, await importPublic(serverJwk))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, pad(plain) as Uint8Array<ArrayBuffer>))
  const epk = await crypto.subtle.exportKey('jwk', mine.publicKey)
  return { v: 1, epk: { x: epk.x!, y: epk.y! }, iv: b64url(iv), ct: b64url(ct) }
}

/** Opens an envelope with the server's private key. Throws on anything that does not open. */
export async function unseal(sealed: Sealed, serverPrivate: CryptoKey): Promise<Plain> {
  const key = await aesKey(serverPrivate, await importPublic({ x: sealed.epk.x, y: sealed.epk.y }))
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64url(sealed.iv) }, key, fromB64url(sealed.ct))
  return unpad(new Uint8Array(bytes))
}
