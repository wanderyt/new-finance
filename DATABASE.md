# Database Setup Guide - Drizzle ORM

## Quick Start

```bash
# 1. Initialize database and create tables
yarn db:push

# 2. Seed with demo user
yarn db:seed

# 3. View database in Drizzle Studio
yarn db:studio
```

Visit **https://local.drizzle.studio** to view your database!

---

## Available Commands

| Command | Description |
|---------|-------------|
| `yarn db:studio` | Launch Drizzle Studio UI for visual database management |
| `yarn db:push` | Push schema changes to database (development) |
| `yarn db:seed` | Seed database with demo data |
| `yarn db:generate` | Generate migration files |
| `yarn db:migrate` | Run pending migrations |

---

## Database Location

- **Path**: `./db/finance.db`
- **Type**: SQLite 3
- **ORM**: Drizzle ORM
- **Driver**: better-sqlite3

---

## Current Schema

### Users Table

```sql
CREATE TABLE users (
  userId INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);
```

**Demo User:**
- Username: `demo`
- Password: `demo123`

---

## Development Workflow

### Making Schema Changes

1. **Update schema**: Edit `app/lib/db/schema.ts`
2. **Push to database**: `yarn db:push` (for development)
3. **Verify in Studio**: `yarn db:studio`

### Production Workflow

1. **Update schema**: Edit `app/lib/db/schema.ts`
2. **Generate migration**: `yarn db:generate`
3. **Review migration**: Check `drizzle/` directory
4. **Run migration**: `yarn db:migrate`

---

## Drizzle Studio

Drizzle Studio provides a visual interface to:
- ✅ Browse tables and data
- ✅ Edit records directly
- ✅ Run custom queries
- ✅ View relationships
- ✅ Export data

**Access**: Runs on https://local.drizzle.studio after `yarn db:studio`

---

## Configuration

See [drizzle.config.ts](drizzle.config.ts) for Drizzle Kit configuration.

```typescript
{
  schema: './app/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './db/finance.db',
  }
}
```

---

## Full Schema Documentation

For complete database design and schema documentation, see:
- [docs/database-setup.md](docs/database-setup.md) - Comprehensive schema design
- [app/lib/db/schema.ts](app/lib/db/schema.ts) - Drizzle ORM schema definitions

---

## Troubleshooting

### Database file not found
```bash
mkdir -p db
yarn db:push
```

### Reset database
```bash
rm db/finance.db
yarn db:push
yarn db:seed
```

### View raw SQL
```bash
sqlite3 db/finance.db ".schema"
sqlite3 db/finance.db "SELECT * FROM users;"
```

---

**Stack**: Next.js 16 + Drizzle ORM + better-sqlite3 + SQLite
