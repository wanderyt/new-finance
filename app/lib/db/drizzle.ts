import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import path from 'path'

const globalForDb = globalThis as unknown as {
  sqlite: Database.Database | undefined
  db: ReturnType<typeof drizzle> | undefined
}

// Lazy initialization function
function getDatabase() {
  if (!globalForDb.sqlite) {
    // Support DATABASE_PATH env var for Docker, fallback to default for local dev
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'db', 'finance.db')
    globalForDb.sqlite = new Database(dbPath)

    if (process.env.NODE_ENV !== 'production') {
      // Keep singleton in dev mode to avoid too many connections
      globalForDb.db = drizzle(globalForDb.sqlite, { schema })
    }
  }

  // Return cached db in dev, create new in production for each request
  if (process.env.NODE_ENV !== 'production' && globalForDb.db) {
    return globalForDb.db
  }

  return drizzle(globalForDb.sqlite, { schema })
}

// Export db as a getter that lazily initializes the connection
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const database = getDatabase()
    return database[prop as keyof typeof database]
  }
})

// Export sqlite getter for direct SQL access if needed
export const sqlite = new Proxy({} as Database.Database, {
  get(_target, prop) {
    if (!globalForDb.sqlite) {
      getDatabase() // Initialize if needed
    }
    return globalForDb.sqlite![prop as keyof Database.Database]
  }
})
