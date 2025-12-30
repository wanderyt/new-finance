import { NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  withAuth,
  badRequestResponse,
  serverErrorResponse,
} from "@/app/lib/middleware/auth";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  "lineItems": [
    {
      "name": "Item name/description",
      "amount": 1250,  // Total item price in cents
      "quantity": 2,
      "unit": "pcs"
    }
  ],
  "totalAmount": 2500  // Total in cents
}

Important rules:
- Extract ALL line items from the receipt
- Convert all amounts to CENTS (multiply by 100)
- For Chinese text, provide English translation of item names
- If quantity is not specified, default to 1
- Calculate totalAmount as sum of all line items
- Return valid JSON only, no markdown or explanation
`;

async function analyzeReceiptWithOpenAI(base64Image: string, mimeType: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // Use mini version if you don't have access to gpt-4o
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: RECEIPT_ANALYSIS_PROMPT,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 2000,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  return JSON.parse(content);
}

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
