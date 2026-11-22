// Creates the database tables the server needs. Safe to run again.   DATABASE_URL=… npm run db:migrate
import { neon } from '@neondatabase/serverless'
import { SCHEMA } from '../server/schema.ts'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}
const sql = neon(url)
for (const statement of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) await sql.query(statement)
console.log('Database ready.')
