import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../app/lib/db/schema'
import path from 'path'

const sqlite = new Database(path.join(process.cwd(), 'db', 'finance.db'))
const db = drizzle(sqlite, { schema })

async function main() {
  console.log('🌱 Seeding database...')

  try {
    // Insert demo user
    await db.insert(schema.users).values({
      username: 'demo',
      password: 'demo123', // TODO: Hash with bcrypt in production
    }).onConflictDoNothing()

    console.log('✅ Demo user created (username: demo, password: demo123)')

    // Verify the user was created
    const users = await db.select().from(schema.users)
    console.log('📊 Users in database:', users)

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    sqlite.close()
  }
}

main()
  .then(() => {
    console.log('✅ Seeding completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
