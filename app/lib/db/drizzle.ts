import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import path from 'path'

const globalForDb = globalThis as unknown as {
  sqlite: Database.Database | undefined
}

// Create better-sqlite3 connection
const sqlite = globalForDb.sqlite ?? new Database(
  path.join(process.cwd(), 'db', 'finance.db')
)

if (process.env.NODE_ENV !== 'production') {
  globalForDb.sqlite = sqlite
}

// Create Drizzle client with type-safe schema
export const db = drizzle(sqlite, { schema })

// Export for direct SQL access if needed
export { sqlite }
