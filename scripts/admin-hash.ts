// Prints the scrypt hash of a reviewer's password for ADMIN_USERS, in the format server/auth.ts
// checks: scrypt$<salt>$<hash>, base64. The password itself is never stored.
//   npm run admin:hash -- 'the password'
import { randomBytes, scryptSync } from 'node:crypto'

const password = process.argv[2]
if (!password) {
  console.error('usage: npm run admin:hash -- <password>')
  process.exit(1)
}
const salt = randomBytes(16)
console.log(`scrypt$${salt.toString('base64')}$${scryptSync(password, salt, 32).toString('base64')}`)
