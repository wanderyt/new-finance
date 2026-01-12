import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import path from 'path'

const globalForDb = globalThis as unknown as {
  sqlite: Database.Database | undefined
}

// Create better-sqlite3 connection
// Support DATABASE_PATH env var for Docker, fallback to default for local dev
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'db', 'finance.db')
const sqlite = globalForDb.sqlite ?? new Database(dbPath)

if (process.env.NODE_ENV !== 'production') {
  globalForDb.sqlite = sqlite
}

// Create Drizzle client with type-safe schema
export const db = drizzle(sqlite, { schema })

// Export for direct SQL access if needed
export { sqlite }
