#!/usr/bin/env tsx

/**
 * Database Cleanup Script: finance.db
 *
 * Removes all existing fin records while preserving seed data.
 *
 * Deletes:
 * - fin_tags (transaction-tag relationships)
 * - fin_items (transaction line items)
 * - fin (transactions)
 * - tags (user-created tags)
 *
 * Preserves:
 * - users (user accounts)
 * - persons (Robin, David, Lily, Luna, Family)
 * - categories (expense/income categories)
 * - fx_snapshots (historical FX rates)
 *
 * Usage:
 *   yarn db:reset-fin-data
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const FINANCE_DB_PATH = path.join(__dirname, '../db/finance.db');

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

async function resetFinData() {
  log('Starting database cleanup...', 'info');
  log('', 'info');

  // Connect to database
  log('Connecting to finance.db...', 'info');
  const db = new Database(FINANCE_DB_PATH, { fileMustExist: true });

  try {
    // Get counts before deletion
    log('Counting records before cleanup...', 'info');
    const beforeCounts = {
      fin: (db.prepare('SELECT COUNT(*) as count FROM fin').get() as { count: number }).count,
      finItems: (db.prepare('SELECT COUNT(*) as count FROM fin_items').get() as { count: number }).count,
      finTags: (db.prepare('SELECT COUNT(*) as count FROM fin_tags').get() as { count: number }).count,
      tags: (db.prepare('SELECT COUNT(*) as count FROM tags WHERE user_id=1').get() as { count: number }).count,
      persons: (db.prepare('SELECT COUNT(*) as count FROM persons').get() as { count: number }).count,
      categories: (db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }).count,
      fxSnapshots: (db.prepare('SELECT COUNT(*) as count FROM fx_snapshots').get() as { count: number }).count,
    };

    log('Before cleanup:', 'info');
    log(`  fin records: ${beforeCounts.fin}`, 'info');
    log(`  fin_items records: ${beforeCounts.finItems}`, 'info');
    log(`  fin_tags records: ${beforeCounts.finTags}`, 'info');
    log(`  tags records: ${beforeCounts.tags}`, 'info');
    log(`  persons records: ${beforeCounts.persons} (will preserve)`, 'info');
    log(`  categories records: ${beforeCounts.categories} (will preserve)`, 'info');
    log(`  fx_snapshots records: ${beforeCounts.fxSnapshots} (will preserve)`, 'info');
    log('', 'info');

    // Confirm deletion
    log('⚠️  This will DELETE all fin records, fin_items, fin_tags, and tags!', 'warning');
    log('Proceeding with deletion in 2 seconds...', 'warning');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    log('', 'info');

    // Delete data in correct order (respect foreign key constraints)
    log('Deleting data...', 'info');

    // 1. Delete fin_tags (many-to-many relationships)
    const finTagsResult = db.prepare('DELETE FROM fin_tags').run();
    log(`  Deleted ${finTagsResult.changes} fin_tags records`, 'success');

    // 2. Delete fin_items (cascade handled by FK, but explicit for clarity)
    const finItemsResult = db.prepare('DELETE FROM fin_items').run();
    log(`  Deleted ${finItemsResult.changes} fin_items records`, 'success');

    // 3. Delete fin (main transaction table)
    const finResult = db.prepare('DELETE FROM fin').run();
    log(`  Deleted ${finResult.changes} fin records`, 'success');

    // 4. Delete tags (user-created tags)
    const tagsResult = db.prepare('DELETE FROM tags WHERE user_id=1').run();
    log(`  Deleted ${tagsResult.changes} tags records`, 'success');

    log('', 'info');

    // Validation: Verify counts after deletion
    log('Validating cleanup...', 'info');
    const afterCounts = {
      fin: (db.prepare('SELECT COUNT(*) as count FROM fin').get() as { count: number }).count,
      finItems: (db.prepare('SELECT COUNT(*) as count FROM fin_items').get() as { count: number }).count,
      finTags: (db.prepare('SELECT COUNT(*) as count FROM fin_tags').get() as { count: number }).count,
      tags: (db.prepare('SELECT COUNT(*) as count FROM tags WHERE user_id=1').get() as { count: number }).count,
      persons: (db.prepare('SELECT COUNT(*) as count FROM persons').get() as { count: number }).count,
      categories: (db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }).count,
      fxSnapshots: (db.prepare('SELECT COUNT(*) as count FROM fx_snapshots').get() as { count: number }).count,
    };

    log('After cleanup:', 'info');
    log(`  fin records: ${afterCounts.fin}`, afterCounts.fin === 0 ? 'success' : 'error');
    log(`  fin_items records: ${afterCounts.finItems}`, afterCounts.finItems === 0 ? 'success' : 'error');
    log(`  fin_tags records: ${afterCounts.finTags}`, afterCounts.finTags === 0 ? 'success' : 'error');
    log(`  tags records: ${afterCounts.tags}`, afterCounts.tags === 0 ? 'success' : 'error');
    log(`  persons records: ${afterCounts.persons} (preserved)`, afterCounts.persons === beforeCounts.persons ? 'success' : 'error');
    log(
      `  categories records: ${afterCounts.categories} (preserved)`,
      afterCounts.categories === beforeCounts.categories ? 'success' : 'error'
    );
    log(
      `  fx_snapshots records: ${afterCounts.fxSnapshots} (preserved)`,
      afterCounts.fxSnapshots === beforeCounts.fxSnapshots ? 'success' : 'error'
    );
    log('', 'info');

    // Summary
    const allClean = afterCounts.fin === 0 && afterCounts.finItems === 0 && afterCounts.finTags === 0 && afterCounts.tags === 0;

    const allPreserved =
      afterCounts.persons === beforeCounts.persons &&
      afterCounts.categories === beforeCounts.categories &&
      afterCounts.fxSnapshots === beforeCounts.fxSnapshots;

    log('='.repeat(60), 'info');
    log('CLEANUP SUMMARY', 'info');
    log('='.repeat(60), 'info');
    log(`Fin data cleaned: ${allClean ? 'PASS ✅' : 'FAIL ❌'}`, allClean ? 'success' : 'error');
    log(`Seed data preserved: ${allPreserved ? 'PASS ✅' : 'FAIL ❌'}`, allPreserved ? 'success' : 'error');
    log('='.repeat(60), 'info');

    if (!allClean || !allPreserved) {
      throw new Error('Cleanup validation failed!');
    }
  } catch (error) {
    log(`Fatal error: ${error instanceof Error ? error.message : String(error)}`, 'error');
    throw error;
  } finally {
    db.close();
    log('Database connection closed', 'info');
  }
}

// Run cleanup
resetFinData()
  .then(() => {
    log('', 'info');
    log('Database cleanup completed successfully!', 'success');
    log('Ready for migration.', 'info');
    process.exit(0);
  })
  .catch((error) => {
    log('', 'info');
    log('Database cleanup failed!', 'error');
    log(error instanceof Error ? error.message : String(error), 'error');
    process.exit(1);
  });
