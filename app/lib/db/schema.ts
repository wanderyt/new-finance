import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  userId: integer('userId').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
