/**
 * Test Data Generator for Price Trend Feature
 *
 * This script generates sample financial transactions across 2025 to test
 * the multi-line price comparison chart feature.
 *
 * Data includes:
 * - 2 merchants: T&T, Walmart
 * - 3 products: 鸡蛋, 茄子, 牛奶
 * - Weekly purchases distributed across all months in 2025
 * - Realistic price variations to show trends
 *
 * Usage:
 *   npx tsx scripts/seed-price-trend-data.ts
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { nanoid } from "nanoid";
import * as schema from "../app/lib/db/schema";
import path from "path";

const { fin: finTable, finItems: finItemsTable } = schema;

// Initialize database connection
const sqlite = new Database(path.join(process.cwd(), "db", "finance.db"));
const db = drizzle(sqlite, { schema });

interface Product {
  name: string;
  unit: string;
  basePrice: {
    tt: number; // T&T base price in cents
    walmart: number; // Walmart base price in cents
  };
}

// Product definitions with realistic pricing
const PRODUCTS: Product[] = [
  {
    name: "鸡蛋",
    unit: "dozen",
    basePrice: {
      tt: 599, // $5.99
      walmart: 649, // $6.49
    },
  },
  {
    name: "茄子",
    unit: "lb",
    basePrice: {
      tt: 199, // $1.99/lb
      walmart: 249, // $2.49/lb
    },
  },
  {
    name: "牛奶",
    unit: "2L",
    basePrice: {
      tt: 549, // $5.49
      walmart: 499, // $4.99
    },
  },
];

const MERCHANTS = ["T&T", "Walmart"];

/**
 * Generate price with realistic variation
 * Simulates price changes over time (seasonal trends, sales, inflation)
 */
function getPriceWithVariation(
  basePrice: number,
  monthIndex: number,
  merchant: string
): number {
  // Seasonal factor (prices slightly higher in winter)
  const seasonalFactor =
    monthIndex < 2 || monthIndex > 9 ? 1.05 : monthIndex > 5 ? 0.95 : 1.0;

  // Random weekly variation (-5% to +10%)
  const weeklyVariation = 0.95 + Math.random() * 0.15;

  // T&T tends to have more sales (occasional 10-20% discounts)
  const salesFactor =
    merchant === "T&T" && Math.random() < 0.2 ? 0.8 + Math.random() * 0.1 : 1.0;

  const finalPrice = basePrice * seasonalFactor * weeklyVariation * salesFactor;

  return Math.round(finalPrice);
}

/**
 * Get a random date within a specific week of a month
 */
function getRandomDateInWeek(year: number, month: number, week: number): Date {
  const daysInWeek = 7;
  const startDay = 1 + (week - 1) * daysInWeek;
  const randomDay = startDay + Math.floor(Math.random() * Math.min(daysInWeek, 28 - startDay + 1));

  return new Date(year, month, randomDay, 10, 0, 0);
}

/**
 * Generate test transactions for price trend analysis
 */
async function seedPriceTrendData(userId: string) {
  console.log("🌱 Starting price trend data generation...\n");

  const transactions: Array<{
    finId: string;
    merchant: string;
    date: string;
    items: Array<{
      name: string;
      unitPriceCents: number;
      originalAmountCents: number;
      qty: number;
      unit: string;
    }>;
  }> = [];

  // Generate transactions for each month in 2025
  for (let month = 0; month < 12; month++) {
    const monthName = new Date(2025, month, 1).toLocaleString("en-US", {
      month: "long",
    });
    console.log(`📅 Generating data for ${monthName} 2025...`);

    // Generate 2-3 purchases per merchant per month (weekly basis)
    for (const merchant of MERCHANTS) {
      const purchasesThisMonth = 2 + Math.floor(Math.random() * 2); // 2-3 purchases

      for (let purchase = 0; purchase < purchasesThisMonth; purchase++) {
        const week = purchase + 1;
        const purchaseDate = getRandomDateInWeek(2025, month, week);
        const finId = nanoid();

        // Each purchase contains 1-2 random products
        const numProducts = 1 + Math.floor(Math.random() * 2);
        const selectedProducts = PRODUCTS.sort(() => Math.random() - 0.5).slice(
          0,
          numProducts
        );

        const items = selectedProducts.map((product) => {
          const basePrice =
            merchant === "T&T"
              ? product.basePrice.tt
              : product.basePrice.walmart;
          const unitPrice = getPriceWithVariation(basePrice, month, merchant);
          const qty = product.name === "鸡蛋" ? 1 : 1 + Math.floor(Math.random() * 2); // 1-2 units

          return {
            name: product.name,
            unitPriceCents: unitPrice,
            originalAmountCents: unitPrice * qty,
            qty,
            unit: product.unit,
          };
        });

        transactions.push({
          finId,
          merchant,
          date: purchaseDate.toISOString(),
          items,
        });
      }
    }
  }

  console.log(`\n📊 Generated ${transactions.length} transactions`);
  console.log(
    `💰 Inserting into database for user: ${userId.substring(0, 8)}...\n`
  );

  // Insert into database
  let insertedFins = 0;
  let insertedItems = 0;

  for (const transaction of transactions) {
    // Insert fin record with TEST_DATA marker
    const totalAmount = transaction.items.reduce(
      (sum, item) => sum + item.originalAmountCents,
      0
    );

    await db.insert(finTable).values({
      finId: transaction.finId,
      userId: Number(userId),
      type: "expense",
      merchant: transaction.merchant,
      date: transaction.date,
      originalCurrency: "CAD",
      originalAmountCents: totalAmount,
      amountCadCents: totalAmount,
      amountUsdCents: Math.round(totalAmount * 0.73), // Approximate USD conversion
      amountCnyCents: Math.round(totalAmount * 5.2), // Approximate CNY conversion
      amountBaseCadCents: totalAmount,
      category: "Grocery",
      subcategory: "Food",
      comment: "TEST_DATA", // Marker for cleanup
    });
    insertedFins++;

    // Insert line items
    for (const item of transaction.items) {
      await db.insert(finItemsTable).values({
        finId: transaction.finId,
        name: item.name,
        unitPriceCents: item.unitPriceCents,
        originalAmountCents: item.originalAmountCents,
        qty: item.qty,
        unit: item.unit,
      });
      insertedItems++;
    }
  }

  console.log(`✅ Successfully inserted:`);
  console.log(`   - ${insertedFins} transactions`);
  console.log(`   - ${insertedItems} line items\n`);

  // Print summary statistics
  console.log("📈 Summary Statistics:");
  console.log("─".repeat(50));

  for (const product of PRODUCTS) {
    const productItems = transactions.flatMap((t) =>
      t.items.filter((i) => i.name === product.name)
    );
    const avgPrice =
      productItems.reduce((sum, i) => sum + i.unitPriceCents, 0) /
      productItems.length /
      100;

    console.log(`\n${product.name}:`);
    console.log(`  Total purchases: ${productItems.length}`);
    console.log(`  Average price: $${avgPrice.toFixed(2)}`);

    for (const merchant of MERCHANTS) {
      const merchantItems = productItems.filter(
        (i) =>
          transactions.find((t) => t.items.includes(i))?.merchant === merchant
      );
      if (merchantItems.length > 0) {
        const merchantAvg =
          merchantItems.reduce((sum, i) => sum + i.unitPriceCents, 0) /
          merchantItems.length /
          100;
        console.log(`  ${merchant}: $${merchantAvg.toFixed(2)} (${merchantItems.length} purchases)`);
      }
    }
  }

  console.log("\n" + "─".repeat(50));
  console.log("✨ Test data generation complete!\n");
  console.log("🧪 To test the feature:");
  console.log("   1. Start dev server: yarn dev");
  console.log("   2. Navigate to Dashboard → 图表 → 价格趋势");
  console.log("   3. Search for: 鸡蛋, 茄子, or 牛奶");
  console.log("   4. View the multi-line price trend chart\n");
}

/**
 * Get user ID from database
 */
function getUserId(): string {
  try {
    const users = sqlite.prepare("SELECT user_id FROM users LIMIT 1").all();
    if (users && users.length > 0) {
      return String((users[0] as any).user_id);
    }
    throw new Error("No users found in database");
  } catch (error) {
    console.error("❌ Failed to get user ID:", error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   Price Trend Test Data Generator               ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  try {
    // Get user ID from database
    const userId = getUserId();
    console.log(`👤 Using user ID: ${userId}\n`);

    await seedPriceTrendData(userId);
  } catch (error) {
    console.error("❌ Error generating test data:", error);
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

export { seedPriceTrendData };
