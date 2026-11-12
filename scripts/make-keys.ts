// Makes the server's envelope key pair. Put the printed private key in Vercel as ENVELOPE_PRIVATE_JWK
// and nowhere else; the app hands out only its public half.   npm run make-keys
const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
console.log(JSON.stringify(await crypto.subtle.exportKey('jwk', pair.privateKey)))
