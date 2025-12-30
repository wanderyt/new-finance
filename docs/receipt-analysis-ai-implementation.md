# Receipt Analysis AI Implementation Plan

## Executive Summary

Implement AI-powered receipt analysis to extract line items, amounts, merchant info, and location from uploaded receipt images. The UI components and API structure already exist - we need to integrate an AI vision API.

## AI Vision API Options Analysis

### 1. **OpenAI GPT-4 Vision (RECOMMENDED)**

**Pros:**
- ✅ **Best-in-class accuracy** for complex receipts with mixed languages (like the T&T sample with English/Chinese)
- ✅ **Excellent structured output** - can reliably return JSON format
- ✅ **Handles various receipt formats** - works with different layouts, fonts, and quality
- ✅ **Strong OCR capabilities** - reads both printed and handwritten text
- ✅ **Clear pricing** - $0.00765/image (1024x1024), very affordable for receipt analysis
- ✅ **Easy integration** - Official Node.js SDK available
- ✅ **Mature API** - Well documented with extensive examples

**Cons:**
- ⚠️ Requires OpenAI API key (paid service, but cost is minimal)
- ⚠️ External dependency on OpenAI service availability

**Model:** `gpt-4o` (latest, best for vision tasks)

**Pricing Details:**
- **Free tier:** OpenAI does NOT offer a free tier for GPT-4 Vision
- **Minimum commitment:** $5 credit when you first sign up (new accounts often get $5 free credit that expires after 3 months)
- **Pay-as-you-go:** After free credit, you pay per API call
- **Estimated Cost:** ~$0.008-$0.01 per receipt analysis

**Important:** You need to add a payment method to use GPT-4 models, even during the free credit period.

---

### 2. **Google Cloud Vision API**

**Pros:**
- ✅ Specialized OCR capabilities
- ✅ Good for structured documents
- ✅ Reliable uptime

**Cons:**
- ⚠️ **Requires additional processing** - Returns raw OCR text, needs custom parsing logic
- ⚠️ **Weaker at understanding context** - Struggles with complex layouts
- ⚠️ More expensive for this use case ($1.50 per 1000 images)
- ⚠️ More complex setup (GCP project, service accounts)

---

### 3. **Azure Computer Vision (Document Intelligence)**

**Pros:**
- ✅ Good OCR and receipt-specific models
- ✅ Pre-built receipt analysis model

**Cons:**
- ⚠️ **Limited customization** - Fixed output schema
- ⚠️ **Not optimized for Asian languages** - May struggle with Chinese text
- ⚠️ More expensive ($1.50 per 1000 transactions)
- ⚠️ Complex Azure setup required

---

### 4. **Anthropic Claude 3 Opus Vision**

**Pros:**
- ✅ Excellent vision capabilities
- ✅ Strong reasoning and structured output
- ✅ Good at handling complex layouts

**Cons:**
- ⚠️ **More expensive** - $0.015 per image (2x OpenAI cost)
- ⚠️ Similar capabilities to GPT-4 Vision but at higher cost
- ⚠️ Newer API, less community examples for receipt parsing

---

### 5. **Open Source Options (Tesseract OCR + Custom Parsing)**

**Pros:**
- ✅ **100% Free** - No API costs ever
- ✅ No external API dependency
- ✅ Self-hosted, complete control

**Cons:**
- ❌ **Significantly lower accuracy** especially for:
  - Multi-language receipts (Chinese + English)
  - Poor image quality
  - Various receipt formats
- ❌ **Requires extensive custom parsing logic** - Need to build receipt structure understanding
- ❌ **High maintenance burden** - Need to handle edge cases manually
- ❌ **Time-consuming development** - Could take weeks to match AI accuracy

---

### 6. **Hugging Face Transformers (Free, but requires setup)**

**Models:** Donut, LayoutLM, TrOCR

**Pros:**
- ✅ **Free to use** - No API costs
- ✅ Open source models
- ✅ Can run locally or on cloud

**Cons:**
- ⚠️ **Requires GPU** - Inference is slow on CPU
- ⚠️ **Complex setup** - Need Python backend, model hosting
- ⚠️ **Lower accuracy than GPT-4** - Especially for varied receipt formats
- ⚠️ **Limited multilingual support** - Struggle with Chinese + English mix
- ⚠️ **Significant development time** - 1-2 weeks to integrate properly

---

### 7. **Google Gemini 1.5 Flash (Most Cost-Effective Paid Option)**

**Pros:**
- ✅ **Cheaper than OpenAI** - $0.00025 per image (40x cheaper!)
- ✅ **Free tier available** - 15 requests/minute for free
- ✅ Good vision capabilities
- ✅ Handles multiple languages well

**Cons:**
- ⚠️ **Newer API** - Less mature than OpenAI
- ⚠️ Slightly lower accuracy on complex receipts
- ⚠️ Free tier has rate limits (15 req/min)

**Note:** This could be a great middle-ground option if cost is a primary concern!

---

## Recommendations

### Option A: **Google Gemini 1.5 Flash** (RECOMMENDED for Cost)

**Best if:** You want a free tier or extremely low cost

**Pros:**
1. **Free tier available** - 15 requests/minute (perfect for personal use)
2. **40x cheaper than OpenAI** when you exceed free tier
3. **Good accuracy** for most receipts including multilingual
4. **Quick implementation** - Similar API to OpenAI

**Cost:**
- Free tier: 900 receipts/hour (more than enough for personal use)
- Paid: $0.00025/receipt (~$0.25 for 1000 receipts vs $10 with OpenAI)

### Option B: **OpenAI GPT-4 Vision** (RECOMMENDED for Accuracy)

**Best if:** You need the absolute best accuracy and don't mind paying

**Pros:**
1. **Best-in-class accuracy** - Superior results on complex/unclear receipts
2. **Handles edge cases** better than alternatives
3. **Proven track record** - Used by many production apps
4. **Reliable structured output**

**Cost:**
- $5 free credit for new accounts (expires in 3 months)
- ~$0.01/receipt after that

---

## Implementation Strategy

**Primary:** Google Gemini 1.5 Flash (for cost-effectiveness and free tier)
**Backup:** OpenAI GPT-4 Vision (implemented as fallback, for best accuracy if needed)

We implement both APIs but use Gemini by default due to its free tier and lower cost. The OpenAI implementation is ready to switch to if higher accuracy is needed.

### Phase 1: Setup & Dependencies

**Files to modify:**
- `package.json` - Add both OpenAI and Google Generative AI dependencies
- `.env.local` (create) - Add API keys configuration

**Steps:**
1. Install both SDKs: `yarn add openai @google/generative-ai`
2. Get Gemini API key from: https://aistudio.google.com/app/apikey (completely free, no payment method required)
3. (Optional) Get OpenAI API key from: https://platform.openai.com/api-keys (for fallback)
4. Create `.env.local` file with:
   ```
   GOOGLE_GEMINI_API_KEY=your-api-key-here  # Required
   OPENAI_API_KEY=sk-...  # Optional, for fallback
   ```
5. Add `.env*.local` to `.gitignore` (if not already)

---

### Phase 2: Implement Receipt Analysis API

**File:** `app/api/receipts/analyze/route.ts`

**Implementation approach - Gemini primary, OpenAI backup:**

```typescript
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = process.env.GOOGLE_GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
  : null;

// Primary implementation using Gemini
async function analyzeReceiptWithGemini(base64Image: string, mimeType: string) {
  if (!genAI) {
    throw new Error("Gemini API key not configured");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent([
    RECEIPT_ANALYSIS_PROMPT,
    {
      inlineData: {
        data: base64Image,
        mimeType
      }
    }
  ]);

  const response = await result.response;
  const text = response.text();

  // Extract JSON from response (Gemini might wrap it in markdown)
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
  return JSON.parse(jsonStr);
}

// Backup implementation using OpenAI (for fallback if needed)
async function analyzeReceiptWithOpenAI(base64Image: string, mimeType: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: RECEIPT_ANALYSIS_PROMPT
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`
            }
          }
        ]
      }
    ],
    response_format: { type: "json_object" },
    max_tokens: 2000
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  return JSON.parse(content);
}

export const POST = withAuth(async (request, user) => {
  // 1. Extract and validate image file
  const formData = await request.formData();
  const file = formData.get("receipt") as File;

  if (!file) {
    return badRequestResponse("No receipt file provided");
  }

  if (!file.type.startsWith("image/")) {
    return badRequestResponse("File must be an image");
  }

  // 2. Convert file to base64
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64Image = buffer.toString("base64");

  // 3. Call Gemini API (primary)
  const receiptData = await analyzeReceiptWithGemini(base64Image, file.type);

  // To switch to OpenAI, uncomment this line and comment out the Gemini call:
  // const receiptData = await analyzeReceiptWithOpenAI(base64Image, file.type);

  // 4. Return structured data
  return NextResponse.json({
    success: true,
    ...receiptData
  });
});
```

**Prompt engineering strategy:**
```typescript
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
```

---

### Phase 3: Integrate Analysis Results with Form

**File:** `app/components/dashboard/FinEditorForm.tsx`

**Current state:** Lines 145-168 log results but don't use them

**Changes needed:**

1. Add state for showing analysis dialog:
   ```typescript
   const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
   const [analysisResult, setAnalysisResult] = useState<ReceiptAnalysisResult | null>(null);
   ```

2. Update `handleReceiptUpload` to show dialog:
   ```typescript
   if (response.ok) {
     const result = await response.json();
     setAnalysisResult(result);
     setShowAnalysisDialog(true);

     // Auto-populate form fields if detected
     if (result.merchant) setMerchant(result.merchant);
     if (result.city) setCity(result.city);
     if (result.date) setDate(new Date(result.date).toISOString().slice(0, 16));
     if (result.detectedCurrency) setCurrency(result.detectedCurrency);
     if (result.totalAmount) setAmount((result.totalAmount / 100).toFixed(2));
   }
   ```

3. Add ReceiptAnalysisDialog component:
   ```typescript
   {showAnalysisDialog && analysisResult && (
     <ReceiptAnalysisDialog
       result={analysisResult}
       onClose={() => setShowAnalysisDialog(false)}
       onApply={(items) => {
         setLineItems(items);
         setShowAnalysisDialog(false);
       }}
     />
   )}
   ```

---

### Phase 4: Error Handling & Edge Cases

**Scenarios to handle:**

1. **Poor image quality**
   - Return error with message: "Unable to read receipt. Please upload a clearer image."

2. **No receipt detected**
   - Check if OpenAI returns empty lineItems
   - Prompt user to try another image

3. **API failures**
   - Catch OpenAI errors (rate limits, API key issues)
   - Show user-friendly error messages
   - Log errors for debugging

4. **Validation**
   - Ensure at least one line item extracted
   - Validate totalAmount matches sum of lineItems (within 5% tolerance for rounding)
   - Check currency is valid (CAD/USD/CNY)

**Error handling structure:**
```typescript
try {
  const response = await openai.chat.completions.create(...);

  if (!response.choices[0].message.content) {
    return badRequestResponse("Unable to analyze receipt");
  }

  const result = JSON.parse(response.choices[0].message.content);

  // Validate
  if (!result.lineItems || result.lineItems.length === 0) {
    return badRequestResponse("No items found on receipt");
  }

  return NextResponse.json({ success: true, ...result });

} catch (error) {
  if (error instanceof OpenAI.APIError) {
    console.error("OpenAI API error:", error);
    return serverErrorResponse("Failed to analyze receipt. Please try again.");
  }
  throw error;
}
```

---

### Phase 5: Testing Strategy

**Test with sample receipt:**
1. Start dev server: `yarn dev`
2. Upload `design/receipt-sample-1.jpeg`
3. Verify extraction:
   - ✅ Merchant: "T&T Supermarket" or "T&T"
   - ✅ Multiple line items extracted
   - ✅ Chinese items translated to English
   - ✅ Amounts in cents
   - ✅ Total calculated correctly

**Edge case tests:**
1. Very small image
2. Rotated receipt
3. Partially obscured receipt
4. Receipt with handwritten notes
5. Non-receipt image (should fail gracefully)

---

## Implementation Checklist

### Setup (15 minutes)
- [ ] Install both packages: `yarn add openai @google/generative-ai`
- [ ] Create `.env.local` with `OPENAI_API_KEY` (and optionally `GOOGLE_GEMINI_API_KEY`)
- [ ] Verify `.env*.local` in `.gitignore`

### API Implementation (1-2 hours)
- [ ] Import both OpenAI and Gemini SDKs in `app/api/receipts/analyze/route.ts`
- [ ] Implement `analyzeReceiptWithOpenAI` function
- [ ] Implement `analyzeReceiptWithGemini` backup function (not invoked by default)
- [ ] Implement base64 image conversion
- [ ] Create analysis prompt
- [ ] Parse and validate response
- [ ] Add error handling for both APIs

### Form Integration (1 hour)
- [ ] Add analysis dialog state in FinEditorForm
- [ ] Update handleReceiptUpload to show dialog
- [ ] Auto-populate form fields from analysis
- [ ] Import and render ReceiptAnalysisDialog

### Testing (30 minutes)
- [ ] Test with sample receipt
- [ ] Verify all fields extracted correctly
- [ ] Test error cases
- [ ] Check line items appear in dialog

### Documentation (30 minutes)
- [ ] Add OpenAI API key setup instructions to README
- [ ] Document expected .env variables
- [ ] Add cost estimation note

---

## Expected Results

After implementation, uploading the T&T receipt sample should extract:

```json
{
  "merchant": "T&T Supermarket",
  "city": "Richmond" (or detected from receipt),
  "date": "2025-12-29",
  "detectedCurrency": "CAD",
  "lineItems": [
    {
      "name": "Frozen Pork Buns",
      "amount": 899,
      "quantity": 1,
      "unit": "bag"
    },
    // ... more items
  ],
  "totalAmount": 33587  // $335.87 in cents
}
```

---

## Cost Estimation (Google Gemini)

**Free Tier:**
- **15 requests/minute** - 900 receipts/hour
- Perfect for personal use - you'll likely never exceed this

**Paid Tier (if you exceed free tier):**
- **Per receipt:** ~$0.00025
- **1000 receipts/month:** ~$0.25
- **10,000 receipts/month:** ~$2.50

**Comparison:**
- Gemini Free Tier: $0 for typical personal use
- OpenAI: ~$10 for 1000 receipts
- **Savings: 100% (free) or 97.5% (paid tier)**

---

## Alternative: Fallback Strategy

If OpenAI cost is a concern, implement a tiered approach:

1. **First 50 receipts/month:** Use OpenAI (cost: ~$0.50)
2. **After limit:** Prompt user to manually enter items OR upgrade

This keeps costs minimal while providing excellent UX.

---

## Critical Files to Modify

1. `package.json` - Add both OpenAI and Google Generative AI dependencies
2. `.env.local` (create) - API keys configuration (Gemini required, OpenAI optional)
3. `app/api/receipts/analyze/route.ts` - Dual implementation (Gemini primary, OpenAI backup)
4. `app/components/dashboard/FinEditorForm.tsx` - Form integration with results
5. `.gitignore` - Ensure env files excluded

## Getting Started

1. **Get Gemini API key:** https://aistudio.google.com/app/apikey (completely free, no payment method required)
2. **(Optional) Get OpenAI API key:** https://platform.openai.com/api-keys (requires payment method, $5 free credit for new accounts)
3. **To switch from Gemini to OpenAI:** Simply comment out the Gemini call and uncomment the OpenAI call in the route handler

---

## Time Estimate

- **Total implementation time:** 3-4 hours
- **Testing & refinement:** 1 hour
- **Documentation:** 30 minutes

**Total:** ~4-5 hours for complete, production-ready implementation
