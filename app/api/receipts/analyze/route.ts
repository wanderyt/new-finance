import { NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  withAuth,
  badRequestResponse,
  serverErrorResponse,
} from "@/app/lib/middleware/auth";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

const genAI = process.env.GOOGLE_GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
  : null;

const RECEIPT_ANALYSIS_PROMPT = `
Analyze this receipt image and extract the following information in JSON format:

{
  "merchant": "Store name",
  "merchantType": "supermarket, restaurant, parking, gas_station, clothing_store, utility, bookstore, music_store, or other",
  "city": "City if visible on receipt",
  "date": "ISO date string with time (YYYY-MM-DDTHH:mm:ss)",
  "detectedCurrency": "CAD, USD, or CNY",
  "subtotalAmount": 2200,  // Subtotal before tax in cents (optional)
  "taxAmount": 286,        // Tax in cents (HST/GST/PST combined, optional)
  "totalAmount": 2486,     // Final total in cents (required)
  "lineItems": [
    {
      "name": "Item name/description",
      "brandName": "Brand name for packaged goods (e.g. Tide, Kirkland, PC Blue Menu) or null",
      "unitPrice": 625,    // Price per unit in cents (if visible on receipt)
      "quantity": 2,       // Quantity purchased
      "unit": "pcs",       // Unit of measurement
      "amount": 1250       // Total line item price in cents
    }
  ]
}

Rules:
- Extract ALL line items (do NOT include tax as a line item)
- Convert amounts to CENTS (multiply by 100)
- IMPORTANT: Extract BOTH date AND time from receipt if available
  - Format as ISO 8601: "YYYY-MM-DDTHH:mm:ss" (e.g., "2026-01-15T14:30:00")
  - If only date is visible (no time), use "12:00:00" as default time
  - If receipt shows "2:30 PM", convert to 24-hour format "14:30:00"
- Identify merchantType based on context:
  - "supermarket": grocery stores, markets (e.g., Walmart, T&T, Costco, No Frills)
  - "restaurant": dining establishments, cafes, fast food (e.g., McDonald's, Tim Hortons, restaurants)
  - "parking": parking lots, parking meters, parking tickets
  - "gas_station": gas stations, fuel stations (e.g., Shell, Esso, Petro-Canada)
  - "clothing_store": clothing retailers, shoe stores, apparel shops
  - "utility": utility bills (electricity, water, gas, internet, phone bills)
  - "bookstore": bookstores, book retailers (e.g., Indigo, Barnes & Noble, 新华书店)
  - "music_store": music instrument stores, music shops (e.g., Long & McQuade, Guitar Center)
  - "other": any other type of merchant
- Extract brandName for packaged grocery products — be aggressive, most packaged goods have a brand:
  - If the brand name appears in the product description, extract it (e.g., "Kingsford Corn Starch" → "Kingsford", "Haday Soybean Paste" → "Haday", "Sunrise Medium Firm Tofu" → "Sunrise", "Oikos Pro 0%" → "Oikos", "Cheesestrings" → "Cheesestrings", "Carbonaut" → "Carbonaut")
  - For Costco/wholesale receipts: items prefixed with "KS" are "Kirkland Signature" (e.g., "KS WATR500" → brandName: "Kirkland Signature"). For other Costco items where no brand is visible but the item is clearly a packaged good (dairy, eggs, meat, frozen food, dry goods, snacks, beverages, oils, nuts), default brandName to "Kirkland Signature"
  - Packaged goods that always have a brand: dairy (milk, yogurt, cheese, butter), eggs, packaged snacks, frozen foods, beverages, cooking oils, canned/jarred goods, condiments, sauces, cleaning products, personal care — extract the brand even if abbreviated in the receipt
- For SUPERMARKET/GROCERY fresh produce (vegetables, fruits, herbs): extract brand or premium variety name if it appears in the product name (e.g., "晴王葡萄" → brandName: "晴王"); otherwise set to null
- For SUPERMARKET/GROCERY store-prepared/cooked food made in-store (rotisserie chicken, sushi trays, deli items, dim sum, ready-to-eat meals, cooked dishes): set brandName to the supermarket/merchant name (e.g., "T&T", "Costco")
- For SUPERMARKET/GROCERY bulk/loose items with no identifiable brand: set brandName to null
- For RESTAURANT receipts: set brandName to the restaurant/merchant name for every dish (e.g., if merchant is "Din Tai Fung", all dishes get brandName: "Din Tai Fung")
- For GAS STATION and PARKING receipts: set brandName to the station or location name. If the payment was processed via a mobile app (e.g., SpotHero, PayByPhone, ParkWhiz), use the app name as brandName
- For all other merchant types (clothing, utility, bookstore, music_store, other): set brandName to null
- If receipt shows unit price (e.g., "$3.99/kg", "$6.25 each"), extract it as unitPrice in cents
- If only total amount is visible (no unit price shown), set unitPrice to null (will be calculated as amount/quantity)
- Verify: unitPrice * quantity ≈ amount (allow small rounding differences)
- If receipt shows subtotal and tax separately, extract both
- If no tax visible, omit taxAmount or set to null
- For Chinese receipts without tax, omit taxAmount
- For Canadian receipts, combine HST/GST/PST as single taxAmount
- Verify: subtotalAmount + taxAmount = totalAmount (if both present)
- For Chinese text, provide English translation
- Return valid JSON only, no markdown
`;

function buildStandardizationPrompt(merchantType: string): string {
  const preamble = `You are an expert at standardizing item names from receipts. Convert item names into standardized Chinese names for household finance tracking.

General rules:
- Use everyday Chinese (家常话), not formal terms
- For items already in Chinese: keep as-is if standardized, otherwise simplify
- For unknown items: keep original name`;

  let contextRules: string;

  switch (merchantType) {
    case "restaurant":
      contextRules = `
Context: This is a RESTAURANT receipt. Preserve specific dish names — they are important for expense tracking.

Rules:
- Prefer Chinese name: if the dish already has a Chinese name on the receipt, use that name directly
- If only English name, translate to the proper Chinese dish name (NOT generic ingredient names)
- Keep the dish identity: "Kung Pao Chicken" → "宫保鸡丁" (NOT "鸡")
- For beverages: use the specific drink name (e.g., "拿铁" not "咖啡", "可乐" not "饮料")
- For set meals / combos, keep the combo name
- Strip portion sizes unless meaningful (e.g., "大份" is useful, "regular" is not)
- If unsure of the correct Chinese dish name, keep the original English name

Examples:
- "Kung Pao Chicken" → "宫保鸡丁"
- "Mapo Tofu" → "麻婆豆腐"
- "Iced Caramel Latte Grande" → "焦糖拿铁"
- "Fish & Chips" → "炸鱼薯条"
- "Spring Roll (2pc)" → "春卷"
- "宫保鸡丁" → "宫保鸡丁" (kept as-is)
- "葱爆羊肉" → "葱爆羊肉" (kept as-is)`;
      break;

    case "bookstore":
      contextRules = `
Context: This is a BOOKSTORE receipt. Preserve book/product titles — they are the primary identifier for tracking.

Rules:
- For books with well-known Chinese titles, use the Chinese title
- For books without a well-known Chinese translation, keep the original language title
- For stationery/accessories, generalize to category names (2-4 characters)
- Keep author names out of the standardized name (just the title)

Examples:
- "The Great Gatsby" → "了不起的盖茨比"
- "Harry Potter and the Philosopher's Stone" → "哈利波特与魔法石"
- "Introduction to Algorithms 4th Ed" → "算法导论"
- "Moleskine Classic Notebook" → "笔记本"
- "Pilot G2 Gel Pen" → "签字笔"`;
      break;

    case "music_store":
      contextRules = `
Context: This is a MUSIC STORE receipt. Preserve specific product names — instruments, music books, and accessories have important identities.

Rules:
- Preserve specific product names and model identifiers
- For music exam books (e.g., RCM, ABRSM), keep the full title including level/grade
- For instruments, keep the type and model (strip brand)
- For generic accessories (strings, picks, cables), generalize to category names (2-4 characters)
- Translate to Chinese where natural, otherwise keep original name

Examples:
- "RCM Celebration Series Repertoire 9" → "RCM Repertoire 9"
- "RCM Celebration Series Etudes 9" → "RCM Etudes 9"
- "RCM Piano Technique Book" → "RCM钢琴技巧"
- "Yamaha U1 Upright Piano" → "立式钢琴"
- "Guitar Strings Set" → "吉他弦"
- "Music Stand" → "谱架"`;
      break;

    case "clothing_store":
      contextRules = `
Context: This is a CLOTHING STORE receipt. Generalize to clothing category names.

Rules:
- Keep names short (2-4 characters preferred)
- Use generic clothing category names, strip brands and specific styles
- Distinguish between main categories: 上衣, 裤子, 外套, 鞋子, 袜子, 帽子, etc.

Examples:
- "Nike Air Max 90" → "运动鞋"
- "Levi's 501 Original Jeans" → "牛仔裤"
- "Canada Goose Parka" → "羽绒服"
- "Uniqlo Cotton T-Shirt" → "T恤"`;
      break;

    case "parking":
      contextRules = `
Context: This is a PARKING receipt.

Rules:
- Simplify to "停车费" for regular paid parking
- For monthly/permit parking, use "月度停车"
- For parking fines/violations, use "停车罚款"
- Strip duration, zone numbers, time details, and location from the item name (location is tracked as brand)

Examples:
- "Underground Parking 2hrs" → "停车费"
- "Hourly Parking Zone A" → "停车费"
- "Monthly Permit Parking" → "月度停车"
- "Parking Violation" → "停车罚款"`;
      break;

    case "gas_station":
      contextRules = `
Context: This is a GAS STATION receipt.

Rules:
- For fuel: keep the grade name only (Regular, Premium, Diesel) — strip "Unleaded", octane numbers, and volume
- For car wash: keep the tier in Chinese (普通洗车, 高档洗车)
- For convenience store items: use generic category names

Examples:
- "Regular Unleaded 87" → "Regular"
- "Premium Unleaded 91" → "Premium"
- "Diesel" → "柴油"
- "Car Wash Basic" → "普通洗车"
- "Car Wash Premium" → "高档洗车"
- "Energy Drink" → "饮料"`;
      break;

    case "supermarket":
    default:
      contextRules = `
Context: This is a SUPERMARKET/GROCERY receipt. Generalize product names to category-level names for grocery tracking.

Rules:
- Keep names short and concise (2-4 characters preferred)
- Use generic category names — strip brands, sizes, organic labels
- e.g., "鸡蛋" not "有机鸡蛋", "牛奶" not "全脂牛奶"
- EXCEPTION — Bread & baked goods: preserve the specific type/filling/flavor, do NOT collapse to "面包". These are distinct products worth tracking separately.
- EXCEPTION — Meat: preserve the specific cut or type (e.g., "猪肩肉" not "猪肉", "鸡腿" not "鸡肉")

Examples:
- "Large Jumbo Eggs 18ct" → "鸡蛋"
- "Organic Whole Milk 2L" → "牛奶"
- "Honey Crisp Apples 3lb" → "苹果"
- "Tide Laundry Detergent" → "洗衣液"
- "Kirkland Toilet Paper 30pk" → "卫生纸"
- "Raisin Plain Loaf" → "提子面包"  (NOT "面包")
- "Fruit Basket Buns" → "水果餐包"  (NOT "面包")
- "Dried Fish Seaweed Bun" → "鱼松海苔包"  (NOT "面包")
- "Pork Floss Bread" → "肉松包"  (NOT "面包")
- "Croissant" → "牛角包"  (NOT "面包")
- "Pork Shoulder Butt Boneless" → "猪肩肉"  (NOT "猪肉")
- "Ground Pork Lean" → "猪绞肉"  (NOT "猪肉")`;
      break;
  }

  return `${preamble}
${contextRules}

Input format:
{
  "items": [{"index": 0, "name": "Large Jumbo Eggs"}]
}

Output format (JSON only, no markdown):
{
  "items": [
    {
      "index": 0,
      "standardizedName": "鸡蛋",
      "originalName": "Large Jumbo Eggs",
      "confidence": "high"
    }
  ]
}`;
}

// async function analyzeReceiptWithOpenAI(base64Image: string, mimeType: string) {
//   const response = await openai.chat.completions.create({
//     model: "gpt-4o-mini", // Use mini version if you don't have access to gpt-4o
//     messages: [
//       {
//         role: "user",
//         content: [
//           {
//             type: "text",
//             text: RECEIPT_ANALYSIS_PROMPT,
//           },
//           {
//             type: "image_url",
//             image_url: {
//               url: `data:${mimeType};base64,${base64Image}`,
//             },
//           },
//         ],
//       },
//     ],
//     response_format: { type: "json_object" },
//     max_tokens: 2000,
//   });

//   const content = response.choices[0].message.content;
//   if (!content) {
//     throw new Error("No response from OpenAI");
//   }

//   return JSON.parse(content);
// }

async function analyzeReceiptWithGemini(base64Image: string, mimeType: string) {
  if (!genAI) {
    throw new Error("Gemini API key not configured");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent([
    RECEIPT_ANALYSIS_PROMPT,
    {
      inlineData: {
        data: base64Image,
        mimeType,
      },
    },
  ]);

  const response = await result.response;
  const text = response.text();

  // Extract JSON from response (Gemini might wrap it in markdown)
  const jsonMatch =
    text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;

  return JSON.parse(jsonStr);
}

interface StandardizationResult {
  index: number;
  standardizedName: string;
  originalName: string;
  confidence: "high" | "medium" | "low";
}

/**
 * Determine category and subcategory for clothing items based on item names
 * For children's items, defaults to adult categories - user can manually adjust to 骐骐/慢慢
 */
function determineCategoryFromClothingItems(
  items: { name: string; [key: string]: unknown }[]
): { category: string; subcategory: string } | null {
  if (!items || items.length === 0) {
    return null;
  }

  // Check if any item is shoes or clothes
  const hasShoes = items.some(
    (item) => item.name.includes("鞋") || item.name.toLowerCase().includes("shoe")
  );
  const hasClothes = items.some(
    (item) =>
      item.name.includes("衣") ||
      item.name.includes("裤") ||
      item.name.includes("外套") ||
      item.name.includes("袜") ||
      item.name.includes("帽") ||
      item.name.toLowerCase().includes("shirt") ||
      item.name.toLowerCase().includes("pant") ||
      item.name.toLowerCase().includes("jacket") ||
      item.name.toLowerCase().includes("coat")
  );

  // Default to adult categories
  // Note: User can manually change to 骐骐/慢慢 if items are for children
  if (hasShoes) {
    return {
      category: "生活",
      subcategory: "鞋子",
    };
  }

  if (hasClothes) {
    return {
      category: "生活",
      subcategory: "衣服",
    };
  }

  // If clothing store but no clear clothing items detected, default to 衣服
  return {
    category: "生活",
    subcategory: "衣服",
  };
}

/**
 * Automatically determine category and subcategory based on merchant type and transaction time
 */
function determineCategory(
  merchantType: string | undefined,
  transactionDate: string | undefined
): { category?: string; subcategory?: string } {
  // Default to no category
  if (!merchantType) {
    return {};
  }

  // Rule 1: Supermarket → "生活" / "买菜原料"
  if (merchantType === "supermarket") {
    return {
      category: "生活",
      subcategory: "买菜原料",
    };
  }

  // Rule 2: Restaurant → category based on weekday/weekend, subcategory based on time
  if (merchantType === "restaurant" && transactionDate) {
    try {
      // Parse the naive datetime string directly to avoid UTC interpretation
      // Gemini returns local time as "YYYY-MM-DDTHH:mm:ss"
      const match = transactionDate.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      if (!match) {
        return {};
      }

      const [, yearStr, monthStr, dayStr, hourStr] = match;
      const year = parseInt(yearStr);
      const month = parseInt(monthStr) - 1; // 0-indexed
      const day = parseInt(dayStr);
      const hour = parseInt(hourStr);

      // Use Date constructor with explicit components (interpreted as local time)
      const date = new Date(year, month, day);
      if (isNaN(date.getTime())) {
        return {};
      }

      // Determine weekday vs weekend
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const category = isWeekend ? "周末" : "周中";

      // Determine meal time based on hour from receipt
      let subcategory: string;

      if (hour >= 5 && hour < 11) {
        // 5:00 AM - 10:59 AM → Breakfast
        subcategory = "早餐";
      } else if (hour >= 11 && hour < 17) {
        // 11:00 AM - 4:59 PM → Lunch
        subcategory = "午餐";
      } else {
        // 5:00 PM - 4:59 AM → Dinner
        subcategory = "晚餐";
      }

      return { category, subcategory };
    } catch (error) {
      console.error("Error determining category from date:", error);
      return {};
    }
  }

  // Rule 3: Parking → "汽车周边" / "停车费"
  if (merchantType === "parking") {
    return {
      category: "汽车周边",
      subcategory: "停车费",
    };
  }

  // Rule 4: Gas Station → "汽车周边" / "燃油"
  if (merchantType === "gas_station") {
    return {
      category: "汽车周边",
      subcategory: "燃油",
    };
  }

  // Rule 5: Utility → "生活" / "水电煤气"
  if (merchantType === "utility") {
    return {
      category: "生活",
      subcategory: "水电煤气",
    };
  }

  // Rule 6: Clothing Store → will be determined by line items (see determineCategoryFromItems)
  if (merchantType === "clothing_store") {
    return {}; // Will be set later based on items
  }

  // Rule 7: Bookstore → "生活" / "书"
  if (merchantType === "bookstore") {
    return {
      category: "生活",
      subcategory: "书",
    };
  }

  // Rule 8: Music Store → "生活" / "学习"
  if (merchantType === "music_store") {
    return {
      category: "生活",
      subcategory: "学习",
    };
  }

  // Rule 9: Other merchant types → no automatic categorization
  return {};
}

async function standardizeItemNames(
  items: { name: string; amount: number; quantity?: number; unit?: string }[],
  merchantType?: string
): Promise<
  {
    name: string;
    amount: number;
    quantity?: number;
    unit?: string;
    notes?: string;
  }[]
> {
  // Guard: Check API key
  if (!genAI) {
    console.warn("Gemini API not configured, skipping standardization");
    return items;
  }

  // Guard: Check items exist
  if (!items || items.length === 0) {
    return items;
  }

  try {
    // Use gemini-2.5-flash-lite for text-only standardization (separate rate limit from vision model)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048, // Increased for larger receipts
        responseMimeType: "application/json",
      },
    });

    const prompt = `${buildStandardizationPrompt(merchantType || "supermarket")}

Input:
${JSON.stringify({
  items: items.map((item, index) => ({ index, name: item.name })),
})}`;

    const result = await model.generateContent(prompt);
    const response = result.response;

    // Get all candidates to check if response was complete
    const candidates = response.candidates;
    console.log("[Standardization] Finish reason:", candidates?.[0]?.finishReason);

    const text = response.text();
    console.log("[Standardization] Response length:", text.length);
    console.log("[Standardization] Full response:", text);

    // Since we specified responseMimeType: "application/json",
    // Gemini should return pure JSON without markdown wrapping
    const parsed = JSON.parse(text) as { items: StandardizationResult[] };

    // Merge standardized names back with original items
    return items.map((item, index) => {
      const standardized = parsed.items?.find((s) => s.index === index);
      if (standardized?.standardizedName) {
        return {
          ...item,
          name: standardized.standardizedName,
          notes: item.name, // Original name goes to notes
        };
      }
      return item; // Fallback to original
    });
  } catch (error) {
    console.error("Item standardization failed:", error);
    return items; // Fallback: return original items unchanged
  }
}

export const POST = withAuth(async (request, user) => {
  try {
    const formData = await request.formData();
    const file = formData.get("receipt") as File;

    if (!file) {
      return badRequestResponse("No receipt file provided");
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return badRequestResponse("File must be an image");
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");

    // Call Gemini Vision API (primary)
    const receiptData = await analyzeReceiptWithGemini(base64Image, file.type);

    // Fallback to OpenAI if needed:
    // const receiptData = await analyzeReceiptWithOpenAI(base64Image, file.type);

    // Map unitPrice to unitPriceCents and standardize item names
    if (receiptData.lineItems && receiptData.lineItems.length > 0) {
      // Map unitPrice to unitPriceCents before standardization
      // If unitPrice is not provided, calculate it as amount / quantity
      const itemsWithUnitPrice = receiptData.lineItems.map((item: {
        name: string;
        amount: number;
        quantity?: number;
        unit?: string;
        unitPrice?: number;
      }) => {
        let unitPriceCents = item.unitPrice;

        // If unitPrice not provided but quantity is available, calculate it
        if (!unitPriceCents && item.quantity && item.quantity > 0) {
          unitPriceCents = Math.round(item.amount / item.quantity);
        }

        return {
          ...item,
          unitPriceCents: unitPriceCents || null,
        };
      });

      receiptData.lineItems = await standardizeItemNames(itemsWithUnitPrice, receiptData.merchantType);
    }

    // Add tax as special line item if present
    if (receiptData.taxAmount && receiptData.taxAmount > 0) {
      receiptData.lineItems.push({
        name: "税",
        amount: receiptData.taxAmount,
        quantity: 1,
        unit: null,
        notes: "Tax (HST/GST/PST combined)",
      });
    }

    // Validate total if both subtotal and tax present
    if (receiptData.subtotalAmount && receiptData.taxAmount) {
      const calculatedTotal = receiptData.subtotalAmount + receiptData.taxAmount;
      // Allow small rounding differences (within 2 cents)
      if (Math.abs(calculatedTotal - receiptData.totalAmount) <= 2) {
        receiptData.totalAmount = calculatedTotal;
      }
    }

    // Validate response
    if (!receiptData.lineItems || receiptData.lineItems.length === 0) {
      return badRequestResponse(
        "No items found on receipt. Please try a clearer image."
      );
    }

    // Automatically determine category and subcategory
    let { category, subcategory } = determineCategory(
      receiptData.merchantType,
      receiptData.date
    );

    // For clothing stores, analyze items to determine category
    if (receiptData.merchantType === "clothing_store" && receiptData.lineItems) {
      const clothingCategory = determineCategoryFromClothingItems(
        receiptData.lineItems
      );
      if (clothingCategory) {
        category = clothingCategory.category;
        subcategory = clothingCategory.subcategory;
        console.log(
          `[Auto Category] clothing_store items → ${category}/${subcategory} (defaults to adult, can manually adjust to 骐骐/慢慢 for children)`
        );
      }
    }

    // Log the auto-detected categories for debugging
    if (category && subcategory) {
      console.log(
        `[Auto Category] ${receiptData.merchantType} → ${category}/${subcategory}`
      );
    }

    return NextResponse.json({
      success: true,
      ...receiptData,
      suggestedCategory: category,
      suggestedSubcategory: subcategory,
    });
  } catch (error) {
    console.error("Failed to analyze receipt:", error);

    // Handle Gemini specific errors
    if (error instanceof Error) {
      if (error.message.includes("API key not configured")) {
        return serverErrorResponse(
          "Gemini API key not configured. Please check your environment variables."
        );
      }
      // Handle other Gemini errors
      if (error.message.includes("quota")) {
        return serverErrorResponse(
          "API quota exceeded. Please try again later."
        );
      }
    }

    // Handle OpenAI specific errors (for fallback)
    if (error instanceof OpenAI.APIError) {
      console.error("OpenAI API error:", error.status, error.message);
      return serverErrorResponse(
        "Failed to analyze receipt. Please try again."
      );
    }

    return serverErrorResponse("Failed to analyze receipt");
  }
});
