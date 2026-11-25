// Makes the key that signs the weekly push (redesign spec 5.11). Put the printed private key in Vercel as
// VAPID_PRIVATE_JWK and nowhere else; the app hands out only its public half.   npm run make-vapid
const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
console.log(JSON.stringify(await crypto.subtle.exportKey('jwk', pair.privateKey)))
console.error('Put the line above in Vercel as VAPID_PRIVATE_JWK, and set VAPID_SUBJECT to mailto:… or https://… for the operator.')
