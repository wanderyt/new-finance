/**
 * Cleanup Test Data Script
 *
 * Removes all test transactions created by seed-price-trend-data.ts
 * Identifies test data by the "TEST_DATA" marker in the comment field
 *
 * Usage:
 *   npx tsx scripts/cleanup-test-data.ts
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../app/lib/db/schema";
import { eq } from "drizzle-orm";
import path from "path";

const { fin: finTable, finItems: finItemsTable } = schema;

// Initialize database connection
const sqlite = new Database(path.join(process.cwd(), "db", "finance.db"));
const db = drizzle(sqlite, { schema });

/**
 * Remove all test data from database
 */
async function cleanupTestData() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   Test Data Cleanup Script                      ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  try {
    // Find all test transactions
    console.log("🔍 Finding test transactions...");
    const testTransactions = await db
      .select({ finId: finTable.finId })
      .from(finTable)
      .where(eq(finTable.comment, "TEST_DATA"));

    if (testTransactions.length === 0) {
      console.log("✅ No test data found. Database is clean.\n");
      return;
    }

    console.log(`📊 Found ${testTransactions.length} test transactions\n`);

    // Delete line items first (foreign key constraint)
    console.log("🗑️  Deleting line items...");
    let deletedItems = 0;
    for (const transaction of testTransactions) {
      await db.delete(finItemsTable).where(eq(finItemsTable.finId, transaction.finId));
      deletedItems++;
    }
    console.log(`   ✓ Deleted line items from ${deletedItems} transactions`);

    // Delete transactions
    console.log("🗑️  Deleting transactions...");
    await db.delete(finTable).where(eq(finTable.comment, "TEST_DATA"));
    console.log(`   ✓ Deleted ${testTransactions.length} transactions`);

    console.log("\n✅ Test data cleanup complete!\n");
  } catch (error) {
    console.error("❌ Error cleaning up test data:", error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    await cleanupTestData();
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main()
    .then(() => {
      console.log("✅ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script failed:", error);
      process.exit(1);
    });
}

export { cleanupTestData };
