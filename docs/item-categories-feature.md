# Item Categories

## Overview

One receipt can contain goods from different categories. For example, a Walmart receipt can contain groceries and clothes.
Each line item can now carry its own category pair. Category reports add item amounts, not record totals.
The editor splits the receipt's tax total across the categories of the taxable items, so each category receives its share of the tax.

## Design Decisions

### Inheritance

1. A null item category pair means that the item follows its record's category pair.
2. The app resolves the pair together. It never combines an item category with a record subcategory.
3. An item subcategory requires an item category. The API rejects a subcategory without a category.
4. When the user changes the record category, every inheriting item follows the new pair.

This model mirrors the spending-priority inheritance model. See [Spending Priority](./spending-priority-feature.md).

### Tax status

Each item stores `tax_status`. The allowed values are:

| Value | Label | Meaning |
|---|---|---|
| `taxable` | 计税 | Default. The item receives a share of the record's tax lines. |
| `exempt` | 免税 | The item receives no tax share. Tips and zero-rated goods use this value. |
| `tax` | 税 | The line is a tax amount. Reports split it across taxable items. |

The app does not calculate tax. Tax rates differ by goods, province, and country.
The app takes the tax amount that the receipt states and splits it in proportion to the taxable item amounts.
The rates themselves do not matter. Only the receipt's tax total and the taxable flag of each line matter.

### Tax lines are split when the user records them

The editor stores one `税` item per category pair of the taxable goods. Each `税` item has an explicit category pair.
The user sees the split before saving and can correct it. An explicit tax line stays whole in reports.

1. The receipt analysis API splits the tax lines in `normalizeReceiptCategories`. The dialog and MCP callers receive split `税` items.
2. The 重新分摊税额 button in both item dialogs merges all `税` items and splits the total again.
   It uses the current item categories, the current 计税 / 免税 choices, and the current tax total.
3. The split uses `splitByWeight`, so the `税` items add up to the tax total in integer cents.
4. If all taxable goods follow the record pair, one `税` item without a category stays. It then follows the record pair.
5. The split copies the first tax line's notes, person, brand, and priority to each `税` item.

The app does not split again on its own. After the user edits goods, the user presses 重新分摊税额.
A report-time split still exists for `税` items without a category, such as legacy records and API callers.
That split marks each share with `taxShare: true`, and the detail list shows it as `税（按计税商品分摊）`.

### Tax lines are identified by name

A tax line always has the name `税`. Users do not select a tax status for it.

1. In the editor, an item named `税` becomes a tax line. A renamed tax line becomes a 计税 good.
2. Goods show a dropdown with 计税 and 免税. A tax line shows a `税` badge in place of the dropdown.
3. Receipt AI renames tax lines such as `HST 13%` to `税`. The original label moves to the notes.
4. An API caller that omits `taxStatus`, such as an MCP tool, gets `tax` for an item named `税` and `taxable` otherwise.

### Report-time split rules

These rules apply in `allocateSpending`. They matter only for `税` items without a category.

1. A tax line with an explicit category stays whole in that category.
2. A tax line without a category splits across the record's taxable items by amount.
3. Shares that fall into the same category pair merge into one allocation.
4. If a record has no taxable items, the tax line follows the record pair.
5. A tax share keeps the tax line's priority. Priority totals therefore do not change.
6. Largest-remainder rounding (`splitByWeight`) keeps the shares equal to the tax amount in integer cents.

### Receipt AI

1. The prompt receives the user's expense category pairs.
2. The AI returns `suggestedCategory` and `suggestedSubcategory` for each item, and a `taxable` flag from the receipt's per-line tax codes.
3. The server keeps only pairs that exist in the user's list. Tax lines never keep a suggestion.
4. If the merchant rule gives no record pair, the record pair is the item pair with the largest amount.
5. Items whose pair equals the record pair store null, so they inherit.
6. Restaurant receipts pass an empty list, so all their items inherit the record pair.
7. Tax lines become `tax`. Tips and lines with `taxable: false` become `exempt`.
8. If any line has `taxable: true`, lines with a null value also become `exempt`. Without any marked line, null lines become `taxable`.

## Implementation Details

### Key files

| File | Purpose |
|---|---|
| `app/lib/db/schema.ts`, `drizzle/0006_add_item_tax_status.sql` | `fin_items.tax_status` column with a check constraint. |
| `scripts/migrate-item-categories.mjs` | Adds the column and converts legacy data once. |
| `app/lib/types/tax.ts` | Tax status values and labels. |
| `app/lib/utils/fin-items.ts` | `toFinItemRows` and `validateItemClassification` for create and update. |
| `app/lib/utils/spending-allocation.ts` | `allocateSpending` and `splitByWeight`. |
| `app/lib/utils/tax-split.ts` | `splitTaxLines`, the record-time split used by receipt analysis and the editor. |
| `app/components/dashboard/ResplitTaxButton.tsx` | The 重新分摊税额 button. |
| `app/api/fin/necessity/route.ts` | Report with level-independent `categories` totals. |
| `app/lib/utils/receipt-categories.ts` | `normalizeReceiptCategories` for AI suggestions. |
| `app/components/dashboard/LineItemEditor.tsx` | Item category, subcategory, and tax status dropdowns. |
| `app/components/dashboard/charts/CategoryAnalysisView.tsx` | Category charts from the server report. |

### Migration

Run `yarn db:migrate:item-categories --dry-run` to preview the counts. Back up the database first, then run `yarn db:migrate:item-categories`.
The script converts data only when the column is missing. It runs in one immediate transaction:

1. It adds `tax_status` with the default `taxable`.
2. It sets `tax` on `税` rows whose notes are null or `Tax (HST/GST/PST combined)`.
3. It sets `exempt` on tip rows (`tip`, `tips`, `gratuity`, `小费`).
4. It sets the item pair to null when the pair equals the record pair.
5. It sets the item pair to null when the pair no longer exists in the user's category list.

A repeat run does nothing. Docker startup runs the script after the spending-priority migration.

### Report

`GET /api/fin/necessity` returns `categories`, a list of `{ category, subcategory, amountCadCents, recordCount }`.
A row with `subcategory: null` holds the total for the whole category. `recordCount` counts distinct records.
Requests with `details=1` do not build `categories`, because the detail list does not read it.

## Known Limitations / Future Work

1. History search filters still match the record category only. They do not match item categories.
2. The app trusts the receipt's tax total. It does not detect a wrong tax amount.
3. Legacy records keep a whole-record category until the user edits their items.
4. A stored split does not follow later edits. If the user changes goods or the record category, the user presses 重新分摊税额.
   - Example: the user changes the record pair in the main form. The `税` items with explicit pairs keep the old pairs.
5. The category view sends one request for the summary and one for the selected details. Each request scans the whole period.
6. The split assumes one tax rate for all taxable items on a receipt. Mixed rates misplace part of the tax between categories. The tax total stays correct.
   - Example: in Ontario, diapers and children's clothing pay 5% and most goods pay 13%. In the US, grocery and clothing rates differ by state.
   - A per-item tax rate field was rejected for now. Users cannot fill it without AI. In the local data, at most 8 of 403 taxed receipts contain possible 5% items.
   - Workaround: edit the amounts of the `税` items by hand. Do not press 重新分摊税额 afterward.
