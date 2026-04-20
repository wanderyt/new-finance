# Item Name Standardization Feature

## Overview

Automatic, context-aware standardization of receipt item names from English to Chinese using Google Gemini 2.5 Flash. The standardization behavior adapts based on merchant type — grocery items are generalized to category names (e.g., "Large Jumbo Eggs" → "鸡蛋"), while restaurant dishes, book titles, and music products preserve their specific identities (e.g., "Kung Pao Chicken" → "宫保鸡丁"). Original names are preserved in the notes field.

## User Requirements

- **Scope**: Item names only (not merchant names)
- **Timing**: Automatic after AI analysis, before showing results to user
- **Storage**: Original name → `notes` field, Standardized name → `name` field
- **Language**: Chinese standardized names preferred

## Architecture

### Data Flow

```
Receipt Upload → Gemini Vision Analysis → Gemini Text Standardization → User Review → Submit
                 (2-3s)                   (+0.5s)
```

### Processing Pipeline

1. User uploads receipt image
2. **Gemini 2.5 Flash (Vision)** extracts items with English names + `merchantType`
3. **Gemini 2.5 Flash Lite (Text)** standardizes items using context-aware prompt based on `merchantType`
4. Transform: `name` = Chinese standardized, `notes` = English original
5. ReceiptAnalysisDialog displays results
6. User confirms → finItems table stores both fields

### Design Principles

- **Context-aware**: Standardization rules adapt to merchant type (supermarket, restaurant, bookstore, music store, clothing store, etc.)
- **Graceful degradation**: Standardization failures never block receipt analysis
- **Fallback**: If standardization fails, return original English names (no notes field)
- **Single API provider**: Both steps use Gemini, simplifying setup
- **Batch processing**: Single API call for all items (cost & performance optimized)

## Implementation Details

### 1. Standardization Function

**Location**: `/app/api/receipts/analyze/route.ts`

**Function**: `standardizeItemNames()`

```typescript
async function standardizeItemNames(
  items: { name: string; amount: number; quantity?: number; unit?: string }[],
  merchantType?: string
): Promise<{ name: string; amount: number; quantity?: number; unit?: string; notes?: string }[]>
```

**Key Features**:
- Uses Gemini 2.5 Flash Lite with temperature 0.3 (consistency)
- Batch processes all items in single API call
- Returns standardized names with original names in notes field
- **Context-aware**: Uses `merchantType` to select appropriate standardization rules
- Graceful error handling (returns original items on failure)

### 2. Prompt Engineering

**Location**: `/app/api/receipts/analyze/route.ts`

**Function**: `buildStandardizationPrompt(merchantType: string)`

Replaced the static `ITEM_STANDARDIZATION_PROMPT` constant with a function that builds a context-aware prompt based on merchant type. This ensures item names are standardized appropriately for different receipt contexts.

**Common Rules** (all merchant types):
- Use everyday Chinese (家常话) not formal terms
- For items already in Chinese: keep as-is if standardized, otherwise simplify
- For unknown items: keep original name
- Preserve original names in notes field
- Few-shot learning with context-specific examples

**Merchant-Type-Specific Strategies**:

#### Supermarket (default)
Generalize to category-level names. Strip brands, sizes, organic labels. Two exceptions preserve specificity:

- **Bread & baked goods**: keep the filling/flavor type — do NOT collapse to "面包"
- **Meat**: keep the cut or specific type — do NOT collapse to "猪肉" / "鸡肉"

Examples:
- "Large Jumbo Eggs 18ct" → "鸡蛋"
- "Organic Whole Milk 2L" → "牛奶"
- "Honey Crisp Apples 3lb" → "苹果"
- "Tide Laundry Detergent" → "洗衣液"
- "Kirkland Toilet Paper 30pk" → "卫生纸"
- "Raisin Plain Loaf" → "提子面包" (NOT "面包")
- "Pork Floss Bread" → "肉松包" (NOT "面包")
- "Fruit Basket Buns" → "水果餐包" (NOT "面包")
- "Pork Shoulder Butt Boneless" → "猪肩肉" (NOT "猪肉")
- "Ground Pork Lean" → "猪绞肉" (NOT "猪肉")

#### Restaurant
Preserve specific dish names. Translate to proper Chinese dish names, not generic ingredients.
- "Kung Pao Chicken" → "宫保鸡丁" (NOT "鸡")
- "Mapo Tofu" → "麻婆豆腐"
- "Iced Caramel Latte Grande" → "焦糖拿铁"
- "Fish & Chips" → "炸鱼薯条"
- "Spring Roll (2pc)" → "春卷"

#### Bookstore
Preserve book titles. Use well-known Chinese titles when available, otherwise keep original language.
- "The Great Gatsby" → "了不起的盖茨比"
- "Harry Potter and the Philosopher's Stone" → "哈利波特与魔法石"
- "Introduction to Algorithms 4th Ed" → "算法导论"
- "Moleskine Classic Notebook" → "笔记本" (stationery gets generalized)

#### Music Store
Preserve specific product names — instruments, music books, and accessories have important identities.
- "RCM Celebration Series Repertoire 9" → "RCM Repertoire 9"
- "RCM Celebration Series Etudes 9" → "RCM Etudes 9"
- "RCM Piano Technique Book" → "RCM钢琴技巧"
- "Yamaha U1 Upright Piano" → "立式钢琴"
- "Guitar Strings Set" → "吉他弦"

#### Clothing Store
Generalize to clothing category names. Strip brands and specific styles.
- "Nike Air Max 90" → "运动鞋"
- "Levi's 501 Original Jeans" → "牛仔裤"
- "Canada Goose Parka" → "羽绒服"
- "Uniqlo Cotton T-Shirt" → "T恤"

#### Other / Default
Use reasonable judgment. Generalize commodity items, preserve meaningful specific names.
- "Regular Unleaded 87" → "汽油"
- "Underground Parking 2hrs" → "停车费"
- "iPhone 15 Pro Max 256GB" → "iPhone 15 Pro"

### 3. Integration Point

**Location**: `/app/api/receipts/analyze/route.ts`

```typescript
// After Gemini analysis
const receiptData = await analyzeReceiptWithGemini(base64Image, file.type);

// Standardize item names with merchant-type context
if (receiptData.lineItems && receiptData.lineItems.length > 0) {
  receiptData.lineItems = await standardizeItemNames(itemsWithUnitPrice, receiptData.merchantType);
}
```

### 4. UI Enhancement

**Location**: `/app/components/dashboard/LineItemEditor.tsx`

**Enhancement**: Show original name below notes input field

```typescript
{localItem.notes && (
  <span className="text-xs text-zinc-500 dark:text-zinc-400">
    原始名称: {localItem.notes}
  </span>
)}
```

### 5. Auto-Category by Merchant Type

**Location**: `/app/api/receipts/analyze/route.ts` — `determineCategory()`

The system automatically assigns category/subcategory based on detected `merchantType`:

| Merchant Type | Category | Subcategory |
|---------------|----------|-------------|
| supermarket | 生活 | 买菜原料 |
| restaurant | 周中/周末 (by day) | 早餐/午餐/晚餐 (by time) |
| parking | 汽车周边 | 停车费 |
| gas_station | 汽车周边 | 燃油 |
| utility | 生活 | 水电煤气 |
| bookstore | 生活 | 书 |
| music_store | 生活 | 学习 |
| clothing_store | 生活 | 衣服/鞋子 (by items) |
| other | — | — |

### 6. Datetime Handling

**Problem**: Gemini returns naive ISO datetime strings (e.g., `"2026-04-16T14:47:00"`) representing receipt local time. JavaScript's `new Date()` interprets naive ISO strings as UTC, causing timezone shifts.

**Solution**: Avoid parsing Gemini's datetime through `new Date(isoString)`. Instead:

- **Form population** (`FinEditorForm.tsx`): Use `result.date.slice(0, 16)` directly for the `datetime-local` input, since both the Gemini output and the input expect the same `YYYY-MM-DDTHH:mm` format in local time.
- **Dialog display** (`ReceiptAnalysisDialog.tsx`): Use `result.date.replace("T", " ")` to display the raw local time.
- **Category determination** (`route.ts`): Parse the datetime string with regex to extract year/month/day/hour components directly, then use `new Date(year, month, day)` constructor (which interprets as local time) for weekday detection.

## Database Schema

**No migration required** - existing schema already supports this:

**Table**: `finItems`
- `name` (text, not null): Stores standardized Chinese name
- `notes` (text, nullable): Stores original English name

## Cost & Performance Analysis

### Cost Comparison

| Provider | Model | Cost per Receipt | Monthly (30 receipts) |
|----------|-------|------------------|----------------------|
| **Gemini** | **2.5 Flash** | **$0.00005** | **$0.005** |
| OpenAI | GPT-4o-mini | $0.0001 | $0.01 |
| **Savings** | - | **50%** | **50%** |

### Performance Metrics

- Gemini vision analysis: 2-3s
- Gemini text standardization: ~0.5s
- **Total latency: 2.5-3.5s** (acceptable UX)

### Optimization Applied

- Batch processing (1 API call vs N individual calls)
- Low temperature (faster generation, more consistent)
- JSON response format (efficient parsing)
- Single API provider (reduced network overhead)

## Benefits of Using Gemini

1. **Already integrated**: No need to add OpenAI dependency or API key
2. **Lower cost**: 50% cheaper than OpenAI GPT-4o-mini
3. **Faster performance**: ~0.5s vs ~1s for standardization
4. **State-of-the-art translation**: Google rolled out major Gemini translation improvements (Dec 2025)
5. **Single provider**: Simplified setup, fewer points of failure
6. **Native Chinese support**: Gemini has excellent Chinese language capabilities

## Configuration

### Environment Variables

**Required** (already configured):
```bash
GOOGLE_GEMINI_API_KEY=...
```

**Optional**:
```bash
ENABLE_ITEM_STANDARDIZATION=true  # Feature flag
```

### Feature Flag

Optional feature flag in `standardizeItemNames()`:

```typescript
if (process.env.ENABLE_ITEM_STANDARDIZATION !== "true") {
  return items;
}
```

## Testing Strategy

### Test Cases

1. **Supermarket receipt** (regression test):
   - ✅ Verify grocery items generalized to category names (e.g., "鸡蛋", "牛奶")
   - ✅ Check original names in notes field
   - ✅ Confirm amounts/quantities preserved

2. **Restaurant receipt**:
   - ✅ Verify dish names preserved specifically (e.g., "宫保鸡丁" not "鸡")
   - ✅ English dish names translated to proper Chinese dish names
   - ✅ Chinese dish names kept as-is

3. **Bookstore receipt**:
   - ✅ Verify book titles preserved (e.g., "了不起的盖茨比")
   - ✅ Stationery items generalized (e.g., "笔记本")
   - ✅ Auto-category set to "生活"/"书"

4. **Music store receipt** (e.g., Long & McQuade):
   - ✅ Verify music book names preserved (e.g., "RCM Repertoire 9" not "书")
   - ✅ Instrument names kept specific
   - ✅ Generic accessories generalized
   - ✅ Auto-category set to "生活"/"学习"

5. **Edge case**: Already Chinese receipt
   - ✅ Verify Chinese names preserved as-is

6. **Error handling**: Invalid API key
   - ✅ Verify receipt analysis still works
   - ✅ Check no errors shown to user
   - ✅ Items retain original English names

7. **Performance**: Large receipt (15+ items)
   - ✅ Total time < 5 seconds
   - ✅ All items standardized correctly

### Manual Testing

1. Start dev server: `yarn dev`
2. Upload sample receipt with English items
3. Verify dialog shows:
   - Chinese standardized names in name field
   - English original names in notes field
4. Submit and check database:
   ```sql
   SELECT name, notes FROM fin_items ORDER BY item_id DESC LIMIT 5;
   ```
5. Expected result:
   - `name`: "鸡蛋"
   - `notes`: "Large Jumbo Eggs"

## Success Criteria

- [ ] All English item names converted to Chinese
- [ ] Original names preserved in `notes` field
- [ ] Amounts, quantities, units unchanged
- [ ] API failures don't break receipt analysis
- [ ] UI shows both standardized and original names
- [ ] User can edit standardized names
- [ ] Database correctly stores both fields
- [ ] Total latency < 5 seconds

## Error Handling

### Failure Scenarios

| Scenario | Handling | User Impact |
|----------|----------|-------------|
| Gemini API failure | Return original names | Works with English names |
| Item already in Chinese | Return as-is | No change needed |
| Malformed response | Parse error → original names | Fallback to English |
| Rate limit (429) | Return original names | Works with English names |
| Network timeout | Return original names after timeout | Works with English names |
| Empty item name | Skip standardization | Empty name unchanged |
| API key missing | Skip standardization | Works with English names |

### Graceful Degradation

```typescript
try {
  // Call Gemini standardization
  const standardized = await callGeminiStandardization(items);
  return standardized;
} catch (error) {
  console.error("Standardization failed:", error);
  return items; // Fallback to original names
}
```

## Future Enhancements (Out of Scope)

- Learning from user edits to improve accuracy
- Category auto-suggestion based on standardized names
- Multi-language support (Spanish, French, etc.)
- History-based personalization (learn user's preferred names)
- Confidence scoring with UI indicators

## Supported Merchant Types

`supermarket`, `restaurant`, `parking`, `gas_station`, `clothing_store`, `utility`, `bookstore`, `music_store`, `other`

## Critical Files Modified

1. **`/app/api/receipts/analyze/route.ts`** (Primary changes)
   - `buildStandardizationPrompt(merchantType)` — context-aware prompt builder
   - `standardizeItemNames(items, merchantType)` — standardization with merchant context
   - `determineCategory(merchantType, date)` — auto-category assignment
   - `RECEIPT_ANALYSIS_PROMPT` — vision prompt with merchant type detection

2. **`/app/components/dashboard/FinEditorForm.tsx`** (Date handling)
   - Uses `result.date.slice(0, 16)` to avoid UTC conversion for datetime-local input

3. **`/app/components/dashboard/ReceiptAnalysisDialog.tsx`** (Date display)
   - Displays raw local time from Gemini without Date parsing

4. **`/app/components/dashboard/LineItemEditor.tsx`** (UI enhancement)
   - Shows original name in notes field

5. **`.env`** (Configuration - optional)
   - Verify `GOOGLE_GEMINI_API_KEY` exists

## References

- [Gemini models | Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs/models)
- [Bringing state-of-the-art Gemini translation capabilities to Google Translate](https://blog.google/products/search/gemini-capabilities-translation-upgrades/)
- [Google Translate Gets Major Gemini Boost](https://slator.com/google-translate-gets-major-gemini-boost/)

## Notes

- **No breaking changes**: Existing receipts continue to work
- **Backward compatible**: Old items without notes field unaffected
- **Easy rollback**: Can disable via feature flag
- **Modular design**: Standardization fully isolated from analysis
- **No new dependencies**: Uses existing Gemini API setup
