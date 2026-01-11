#!/usr/bin/env tsx

/**
 * Migration Script: test.db → finance.db
 *
 * Migrates the latest 500 non-scheduled financial records from 2025 in test.db
 * to the new schema in finance.db.
 *
 * Features:
 * - Converts amounts from dollars to cents
 * - Applies FX rates for multi-currency support
 * - Migrates comma-separated tags to tags table
 * - Auto-creates fin_items for person-specific categories (骐骐→Robin, 慢慢→Luna)
 * - Supports dry-run mode for preview
 *
 * Usage:
 *   yarn migrate:fin              # Execute migration
 *   yarn migrate:fin:dry-run      # Preview without changes
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command-line arguments
const isDryRun = process.argv.includes('--dry-run');

// Database paths
const TEST_DB_PATH = path.join(__dirname, '../db/test.db');
const FINANCE_DB_PATH = path.join(__dirname, '../db/finance.db');

// Person-category mapping
const PERSON_CATEGORY_MAP: Record<string, string> = {
  '骐骐': 'Robin',
  '慢慢': 'Luna',
};

// Type definitions
interface OldFinRecord {
  id: string;
  category: string | null;
  subcategory: string | null;
  comment: string | null;
  date: string;
  amount: number;
  isScheduled: number | null;
  scheduleId: string | null;
  place: string | null;
  city: string | null;
  USERID: number;
  tags: string | null;
  details: string | null;
}

interface FXRate {
  fx_id: number;
  cad_to_usd: number;
  cad_to_cny: number;
}

interface Person {
  person_id: number;
  name: string;
}

interface Tag {
  tag_id: number;
  name: string;
}

interface MigrationStats {
  totalProcessed: number;
  recordsInserted: number;
  recordsSkipped: number;
  tagsCreated: number;
  itemsCreated: number;
  errors: string[];
}

// Helper functions
function log(message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const prefix = {
    info: '📋',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  }[level];

  console.log(`${prefix} ${message}`);
}

function toDisplayAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

// Main migration function
async function migrate() {
  log(`Migration Mode: ${isDryRun ? 'DRY-RUN (no changes)' : 'EXECUTE'}`, 'info');
  log('', 'info');

  // Connect to databases
  log('Connecting to databases...', 'info');
  const testDb = new Database(TEST_DB_PATH, { readonly: true });
  const financeDb = isDryRun
    ? new Database(FINANCE_DB_PATH, { readonly: true })
    : new Database(FINANCE_DB_PATH, { fileMustExist: true });

  const stats: MigrationStats = {
    totalProcessed: 0,
    recordsInserted: 0,
    recordsSkipped: 0,
    tagsCreated: 0,
    itemsCreated: 0,
    errors: [],
  };

  try {
    // Load reference data from finance.db
    log('Loading reference data from finance.db...', 'info');

    // Get latest FX rate
    const fxRate = financeDb
      .prepare('SELECT fx_id, cad_to_usd, cad_to_cny FROM fx_snapshots ORDER BY captured_at DESC LIMIT 1')
      .get() as FXRate | undefined;

    if (!fxRate) {
      throw new Error('No FX rate found in finance.db');
    }

    log(`Using FX rate (fx_id=${fxRate.fx_id}): CAD→USD=${fxRate.cad_to_usd}, CAD→CNY=${fxRate.cad_to_cny}`, 'info');

    // Load persons map
    const persons = financeDb
      .prepare('SELECT person_id, name FROM persons WHERE user_id=1')
      .all() as Person[];

    const personsMap = new Map<string, number>();
    persons.forEach((p) => personsMap.set(p.name, p.person_id));

    log(`Loaded ${persons.length} persons: ${persons.map((p) => p.name).join(', ')}`, 'info');

    // Query records from test.db
    log('Querying records from test.db...', 'info');
    const oldRecords = testDb
      .prepare(
        `SELECT * FROM FIN
         WHERE (isScheduled = 0 OR isScheduled IS NULL)
         AND date LIKE '2025%'
         ORDER BY date DESC
         LIMIT 500`
      )
      .all() as OldFinRecord[];

    log(`Found ${oldRecords.length} records to migrate`, 'success');
    log('', 'info');

    if (oldRecords.length === 0) {
      log('No records to migrate', 'warning');
      return;
    }

    // Process each record
    log('Processing records...', 'info');
    log('', 'info');

    // Track tags to avoid duplicate inserts
    const existingTags = new Map<string, number>();
    const allTags = financeDb.prepare('SELECT tag_id, name FROM tags WHERE user_id=1').all() as Tag[];
    allTags.forEach((t) => existingTags.set(t.name, t.tag_id));

    // Prepare statements (only in execute mode)
    const insertFinStmt = isDryRun
      ? null
      : financeDb.prepare(`
          INSERT OR IGNORE INTO fin (
            fin_id, user_id, type, date, scheduled_on, schedule_rule_id,
            merchant, comment, place, city, category, subcategory, details,
            original_currency, original_amount_cents, fx_id,
            amount_cad_cents, amount_usd_cents, amount_cny_cents, amount_base_cad_cents,
            is_scheduled
          ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?
          )
        `);

    const insertTagStmt = isDryRun ? null : financeDb.prepare('INSERT OR IGNORE INTO tags (user_id, name) VALUES (?, ?)');

    const getTagIdStmt = financeDb.prepare('SELECT tag_id FROM tags WHERE user_id=? AND name=?');

    const insertFinTagStmt = isDryRun ? null : financeDb.prepare('INSERT OR IGNORE INTO fin_tags (fin_id, tag_id) VALUES (?, ?)');

    const insertFinItemStmt = isDryRun
      ? null
      : financeDb.prepare(`
          INSERT INTO fin_items (
            fin_id, line_no, name, original_amount_cents, person_id, category, subcategory
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

    for (let i = 0; i < oldRecords.length; i++) {
      const old = oldRecords[i];
      stats.totalProcessed++;

      try {
        // Calculate amounts in cents
        const amount = Math.abs(old.amount || 0);
        const originalAmountCents = Math.round(amount * 100);
        const amountCadCents = originalAmountCents;
        const amountUsdCents = Math.round(amount * 100 * fxRate.cad_to_usd);
        const amountCnyCents = Math.round(amount * 100 * fxRate.cad_to_cny);
        const amountBaseCadCents = originalAmountCents;

        if (old.amount < 0) {
          log(`Warning: Negative amount ${old.amount} for record ${old.id}, using absolute value`, 'warning');
        }

        // Parse tags
        const tagNames = old.tags
          ? old.tags
              .split(',')
              .map((t) => t.trim())
              .filter((t) => t.length > 0)
          : [];

        // Detect person-specific categories
        const detectedPersons: { personId: number; personName: string }[] = [];

        for (const [categoryKey, personName] of Object.entries(PERSON_CATEGORY_MAP)) {
          if (old.category === categoryKey || tagNames.includes(categoryKey)) {
            const personId = personsMap.get(personName);
            if (personId) {
              detectedPersons.push({ personId, personName });
            }
          }
        }

        // Dry-run: Log first 10 records
        if (isDryRun && i < 10) {
          log(`Record ${i + 1}/${oldRecords.length}: ${old.id}`, 'info');
          log(`  Date: ${old.date}`, 'info');
          log(`  Merchant: ${old.comment || '(empty)'}`, 'info');
          log(`  Category: ${old.category || '(empty)'} / ${old.subcategory || '(empty)'}`, 'info');
          log(`  Amount: $${amount.toFixed(2)} → ${originalAmountCents}¢ CAD, ${amountUsdCents}¢ USD, ${amountCnyCents}¢ CNY`, 'info');
          if (tagNames.length > 0) {
            log(`  Tags: ${tagNames.join(', ')}`, 'info');
          }
          if (detectedPersons.length > 0) {
            log(
              `  Person Items: ${detectedPersons.map((p) => `${p.personName} (ID ${p.personId})`).join(', ')}`,
              'info'
            );
          }
          log('', 'info');
        }

        // Execute mode: Insert records
        if (!isDryRun) {
          // Insert transaction
          const finResult = insertFinStmt!.run(
            old.id, // fin_id
            1, // user_id (always 1)
            'expense', // type
            old.date, // date
            null, // scheduled_on
            null, // schedule_rule_id
            old.comment, // merchant
            old.comment, // comment
            old.place, // place
            old.city, // city
            old.category, // category
            old.subcategory, // subcategory
            old.details, // details
            'CAD', // original_currency
            originalAmountCents, // original_amount_cents
            fxRate.fx_id, // fx_id
            amountCadCents, // amount_cad_cents
            amountUsdCents, // amount_usd_cents
            amountCnyCents, // amount_cny_cents
            amountBaseCadCents, // amount_base_cad_cents
            0 // is_scheduled
          );

          if (finResult.changes > 0) {
            stats.recordsInserted++;
          } else {
            stats.recordsSkipped++;
          }

          // Insert tags
          for (const tagName of tagNames) {
            if (!existingTags.has(tagName)) {
              insertTagStmt!.run(1, tagName);
              const newTag = getTagIdStmt.get(1, tagName) as Tag | undefined;
              if (newTag) {
                existingTags.set(tagName, newTag.tag_id);
                stats.tagsCreated++;
              }
            }

            const tagId = existingTags.get(tagName);
            if (tagId) {
              insertFinTagStmt!.run(old.id, tagId);
            }
          }

          // Insert person-specific items
          for (const person of detectedPersons) {
            insertFinItemStmt!.run(
              old.id, // fin_id
              null, // line_no
              old.comment || 'Item', // name
              originalAmountCents, // original_amount_cents
              person.personId, // person_id
              old.category, // category
              old.subcategory // subcategory
            );
            stats.itemsCreated++;
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        stats.errors.push(`Record ${old.id}: ${errorMsg}`);
        log(`Error processing record ${old.id}: ${errorMsg}`, 'error');
      }
    }

    // Summary
    log('', 'info');
    log('='.repeat(60), 'info');
    log('MIGRATION SUMMARY', 'info');
    log('='.repeat(60), 'info');
    log(`Total Records Processed: ${stats.totalProcessed}`, 'info');

    if (!isDryRun) {
      log(`Records Inserted: ${stats.recordsInserted}`, 'success');
      log(`Records Skipped (duplicates): ${stats.recordsSkipped}`, 'warning');
      log(`Tags Created: ${stats.tagsCreated}`, 'success');
      log(`Person Items Created: ${stats.itemsCreated}`, 'success');
      log(`Errors: ${stats.errors.length}`, stats.errors.length > 0 ? 'error' : 'success');

      if (stats.errors.length > 0) {
        log('', 'info');
        log('ERRORS:', 'error');
        stats.errors.forEach((err) => log(`  - ${err}`, 'error'));
      }
    } else {
      log('(Dry-run mode - no changes made)', 'info');
      log(`Would insert: ${stats.totalProcessed} records`, 'info');
      log(`Estimated tags: ${new Set(oldRecords.flatMap((r) => (r.tags ? r.tags.split(',').map((t) => t.trim()) : []))).size}`, 'info');
      log(
        `Estimated person items: ${oldRecords.filter((r) => Object.keys(PERSON_CATEGORY_MAP).some((key) => r.category === key || r.tags?.includes(key))).length}`,
        'info'
      );
    }

    log('='.repeat(60), 'info');
  } catch (error) {
    log(`Fatal error: ${error instanceof Error ? error.message : String(error)}`, 'error');
    throw error;
  } finally {
    testDb.close();
    financeDb.close();
    log('Database connections closed', 'info');
  }
}

// Run migration
migrate()
  .then(() => {
    log('', 'info');
    log('Migration completed successfully!', 'success');
    if (isDryRun) {
      log('Run without --dry-run to execute the migration', 'info');
    }
    process.exit(0);
  })
  .catch((error) => {
    log('', 'info');
    log('Migration failed!', 'error');
    log(error instanceof Error ? error.message : String(error), 'error');
    process.exit(1);
  });
