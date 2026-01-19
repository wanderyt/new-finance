#!/usr/bin/env tsx

/**
 * Add "商户 <> 返现" category for all users
 * This is a standalone executable script that can be run in Docker environment
 */

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../app/lib/db/schema'
import path from 'path'

const sqlite = new Database(path.join(process.cwd(), 'db', 'finance.db'))
const db = drizzle(sqlite, { schema })

async function main() {
  console.log('🏪 Adding merchant cashback category (商户 <> 返现)...')

  try {
    // Get all users
    const users = await db.select().from(schema.users)
    console.log(`📊 Found ${users.length} user(s)`)

    if (users.length === 0) {
      console.log('⚠️  No users found. Please ensure database is seeded.')
      process.exit(1)
    }

    // Add the category for each user
    let addedCount = 0
    for (const user of users) {
      try {
        await db.insert(schema.categories).values({
          userId: user.userId,
          category: '商户',
          subcategory: '返现',
          appliesTo: 'income',
          isCommon: false,
        }).onConflictDoNothing()

        addedCount++
        console.log(`✅ Added category for user: ${user.username} (ID: ${user.userId})`)
      } catch (error) {
        console.log(`ℹ️  Category already exists for user: ${user.username} (ID: ${user.userId})`)
      }
    }

    console.log(`\n✨ Successfully processed ${addedCount} user(s)`)
    console.log('📋 Category details:')
    console.log('   Category: 商户')
    console.log('   Subcategory: 返现')
    console.log('   Type: income')
  } catch (error) {
    console.error('❌ Error adding category:', error)
    process.exit(1)
  }

  sqlite.close()
}

main()
