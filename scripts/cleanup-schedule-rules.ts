import { db } from "../app/lib/db/drizzle";
import { scheduleRules, fin } from "../app/lib/db/schema";
import { sql } from "drizzle-orm";

/**
 * Cleanup script to remove orphaned schedule rules
 * that have no associated fin records
 */
async function cleanupOrphanedScheduleRules() {
  try {
    console.log("🔍 Checking for orphaned schedule rules...\n");

    // Find schedule rules that have no associated fin records
    const orphanedRules = await db
      .select({
        scheduleRuleId: scheduleRules.scheduleRuleId,
        name: scheduleRules.name,
        userId: scheduleRules.userId,
      })
      .from(scheduleRules)
      .leftJoin(fin, sql`${scheduleRules.scheduleRuleId} = ${fin.scheduleRuleId}`)
      .where(sql`${fin.finId} IS NULL`);

    if (orphanedRules.length === 0) {
      console.log("✅ No orphaned schedule rules found. Database is clean!");
      return;
    }

    console.log(`Found ${orphanedRules.length} orphaned schedule rule(s):\n`);
    orphanedRules.forEach((rule) => {
      console.log(`  - ID: ${rule.scheduleRuleId} | Name: "${rule.name}" | User ID: ${rule.userId}`);
    });

    // Delete orphaned schedule rules
    const orphanedIds = orphanedRules.map((r) => r.scheduleRuleId);

    const result = await db
      .delete(scheduleRules)
      .where(sql`${scheduleRules.scheduleRuleId} IN ${orphanedIds}`)
      .returning();

    console.log(`\n✅ Deleted ${result.length} orphaned schedule rule(s)`);

  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupOrphanedScheduleRules()
  .then(() => {
    console.log("\n✨ Cleanup completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  });
