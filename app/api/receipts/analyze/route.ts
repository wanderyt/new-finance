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
  "city": "City if visible on receipt",
  "date": "ISO date string (YYYY-MM-DD)",
  "detectedCurrency": "CAD, USD, or CNY",
  "subtotalAmount": 2200,  // Subtotal before tax in cents (optional)
  "taxAmount": 286,        // Tax in cents (HST/GST/PST combined, optional)
  "totalAmount": 2486,     // Final total in cents (required)
  "lineItems": [
    {
      "name": "Item name/description",
      "amount": 1250,  // Item price in cents
      "quantity": 2,
      "unit": "pcs"
    }
  ]
}

Rules:
- Extract ALL line items (do NOT include tax as a line item)
- Convert amounts to CENTS (multiply by 100)
- If receipt shows subtotal and tax separately, extract both
- If no tax visible, omit taxAmount or set to null
- For Chinese receipts without tax, omit taxAmount
- For Canadian receipts, combine HST/GST/PST as single taxAmount
- Verify: subtotalAmount + taxAmount = totalAmount (if both present)
- For Chinese text, provide English translation
- Return valid JSON only, no markdown
`;

const ITEM_STANDARDIZATION_PROMPT = `You are an expert at standardizing grocery item names from receipts. Convert English/mixed-language item names into standardized Chinese names for household finance tracking.

Rules:
- Use everyday Chinese (家常话), not formal terms
- Keep names short and concise (2-4 characters preferred)
- Use generic category names (e.g., "鸡蛋" not "有机鸡蛋")
- For items already in Chinese: keep as-is if standardized, otherwise simplify
- For unknown items: keep original name

Examples:
- "Large Jumbo Eggs 18ct" → "鸡蛋"
- "Organic Whole Milk 2L" → "牛奶"
- "Honey Crisp Apples 3lb" → "苹果"
- "Tide Laundry Detergent" → "洗衣液"

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

async function standardizeItemNames(
  items: { name: string; amount: number; quantity?: number; unit?: string }[]
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

    const prompt = `${ITEM_STANDARDIZATION_PROMPT}

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

    // Standardize item names (automatically converts to Chinese)
    if (receiptData.lineItems && receiptData.lineItems.length > 0) {
      receiptData.lineItems = await standardizeItemNames(receiptData.lineItems);
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

    return NextResponse.json({
      success: true,
      ...receiptData,
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
