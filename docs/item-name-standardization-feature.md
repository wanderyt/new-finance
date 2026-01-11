# Item Name Standardization Feature

## Overview

Automatic standardization of receipt item names from English to Chinese using Google Gemini 2.5 Flash. This feature enhances the existing receipt analysis by transforming extracted item names (e.g., "Large Jumbo Eggs" → "鸡蛋") while preserving original names in the notes field.

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
2. **Gemini 2.5 Flash (Vision)** extracts items with English names
3. **NEW: Gemini 2.5 Flash (Text)** standardizes all items in single batch call
4. Transform: `name` = Chinese standardized, `notes` = English original
5. ReceiptAnalysisDialog displays results
6. User confirms → finItems table stores both fields

### Design Principles

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
  items: { name: string; amount: number; quantity?: number; unit?: string }[]
): Promise<{ name: string; amount: number; quantity?: number; unit?: string; notes?: string }[]>
```

**Key Features**:
- Uses Gemini 2.5 Flash with temperature 0.3 (consistency)
- Batch processes all items in single API call
- Returns standardized names with original names in notes field
- Graceful error handling (returns original items on failure)

### 2. Prompt Engineering

**Location**: `/app/api/receipts/analyze/route.ts`

**Constant**: `ITEM_STANDARDIZATION_PROMPT`

**Prompt Strategy**:
- Use everyday Chinese (家常话) not formal terms
- Keep names short and concise (2-4 characters preferred)
- Use generic category names (e.g., "鸡蛋" not "有机鸡蛋")
- Preserve original qualifiers in notes field
- Few-shot learning with examples

**Examples**:
- "Large Jumbo Eggs 18ct" → name: "鸡蛋", notes: "Large Jumbo Eggs 18ct"
- "Organic Whole Milk 2L" → name: "牛奶", notes: "Organic Whole Milk 2L"
- "Honey Crisp Apples 3lb" → name: "苹果", notes: "Honey Crisp Apples 3lb"
- "Tide Laundry Detergent" → name: "洗衣液", notes: "Tide Laundry Detergent"

### 3. Integration Point

**Location**: `/app/api/receipts/analyze/route.ts` after line 126

```typescript
// After Gemini analysis
const receiptData = await analyzeReceiptWithGemini(base64Image, file.type);

// NEW: Standardize item names
if (receiptData.lineItems && receiptData.lineItems.length > 0) {
  receiptData.lineItems = await standardizeItemNames(receiptData.lineItems);
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

1. **Happy path**: Upload English receipt
   - ✅ Verify items standardized to Chinese
   - ✅ Check original names in notes field
   - ✅ Confirm amounts/quantities preserved

2. **Edge case**: Already Chinese receipt
   - ✅ Verify Chinese names preserved as-is

3. **Error handling**: Invalid API key
   - ✅ Verify receipt analysis still works
   - ✅ Check no errors shown to user
   - ✅ Items retain original English names

4. **Performance**: Large receipt (15+ items)
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

## Critical Files Modified

1. **`/app/api/receipts/analyze/route.ts`** (Primary changes)
   - Add `ITEM_STANDARDIZATION_PROMPT` constant
   - Add `standardizeItemNames()` function
   - Integrate call after Gemini analysis

2. **`/app/components/dashboard/LineItemEditor.tsx`** (UI enhancement)
   - Update notes field display
   - Add helper text showing original name

3. **`.env`** (Configuration - optional)
   - Verify `GOOGLE_GEMINI_API_KEY` exists
   - Optional: Add `ENABLE_ITEM_STANDARDIZATION` flag

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
