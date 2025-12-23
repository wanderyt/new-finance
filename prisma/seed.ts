import Database from 'better-sqlite3'

const db = new Database('./db/finance.db')

function main() {
  // Create demo user for testing
  const insert = db.prepare(`
    INSERT OR REPLACE INTO users (userId, username, password)
    VALUES (1, 'demo', 'demo123')
  `)

  const result = insert.run()
  console.log('✅ Demo user created:', result)

  // Verify the user was created
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get('demo')
  console.log('User in database:', user)

  db.close()
}

try {
  main()
} catch (e) {
  console.error('❌ Error seeding database:', e)
  db.close()
  process.exit(1)
}
