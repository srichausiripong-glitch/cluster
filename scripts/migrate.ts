// Creates the database tables the server needs. Safe to run again.   DATABASE_URL=… npm run db:migrate
import { neon } from '@neondatabase/serverless'
import { databaseUrl } from '../server/dbUrl.ts'
import { SCHEMA } from '../server/schema.ts'

// A preview deploy migrates its own database when it has one (server/dbUrl.ts).
const { url, preview } = databaseUrl((name) => process.env[name])
if (!url) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}
const sql = neon(url)
for (const statement of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) await sql.query(statement)
console.log(preview ? 'Database ready (preview database).' : 'Database ready.')
