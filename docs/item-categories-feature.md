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
| `tax` | 税 | The line is a tax amount. The editor splits it across the categories of taxable items. |

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
Reports do not split tax. A `税` item without a category follows the record pair, like any other item.

### Tax lines are identified by name

A tax line always has the name `税`. Users do not select a tax status for it.

1. In the editor, an item named `税` becomes a tax line. A renamed tax line becomes a 计税 good.
2. Goods show a dropdown with 计税 and 免税. A tax line shows a `税` badge in place of the dropdown.
3. Receipt AI renames tax lines such as `HST 13%` to `税`. The original label moves to the notes.
4. An API caller that omits `taxStatus`, such as an MCP tool, gets `tax` for an item named `税` and `taxable` otherwise.

### Editor display

1. The category and subcategory dropdowns always show the final pair. There is no "跟随账单" or "按计税商品分摊" option.
2. An item without its own pair, tax lines included, shows the record pair. A change to the record pair updates the display.
3. Selecting the record pair stores null. The item then keeps following later record changes.
4. Selecting another category stores that category without a subcategory. The user then selects the subcategory.

The report-time tax split was removed. It made the editor show a pair that the report did not use.
The local data had no record where a `税` item without a category had taxable goods in different pairs.

### Receipt AI

1. The prompt receives the user's expense category pairs.
2. The AI returns `suggestedCategory` and `suggestedSubcategory` for each item, and a `taxable` flag from the receipt's per-line tax codes.
3. The server keeps only pairs that exist in the user's list. Tax lines never keep a suggestion.
4. If the merchant rule gives no record pair, the record pair is the item pair with the largest amount.
5. Items whose pair equals the record pair store null, so they inherit.
6. Restaurant receipts pass an empty list, so all their items inherit the record pair.
7. Tax lines become `tax`. Tips and lines with `taxable: false` become `exempt`.
8. If any line has `taxable: true`, lines with a null value also become `exempt`. Without any marked line, null lines become `taxable`.
9. The prompt describes the children for the user's child categories: 骐骐 is Robin, a boy born in 2014, and 慢慢 is Luna, a girl born in 2022.
   The AI calculates their ages from the receipt date. A product made for children, such as children's vitamins, always uses a pair of one child.
   The AI selects the child whose age and gender fit the product best. If more than one child fits equally, it selects the youngest child.
   Items that the family shares, such as groceries and household goods, keep the normal pairs.
10. In receipt review, an item whose final pair is in 骐骐 starts with the person Robin. An item in 慢慢 starts with Luna. Other items start with the default person.
    The final pair is the item pair, or else the record pair. In the local data, 97.5% of 骐骐 items and 95% of 慢慢 items use these persons.

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
| `app/lib/utils/children.ts` | The child list, `isChild`, `childPersonId`, and the children prompt. Pocket money also uses `isChild`. |
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
   - Example: the user moves a good to another category. A `税` item without a category stays on the record pair.
5. The category view sends one request for the summary and one for the selected details. Each request scans the whole period.
6. The split assumes one tax rate for all taxable items on a receipt. Mixed rates misplace part of the tax between categories. The tax total stays correct.
7. The child list is fixed in `children.ts`. A new child needs a code change, a category, and a person with the same name.
8. The person follows the child pair only when receipt review opens. A later category change in the editor does not change the person.
   - Example: in Ontario, diapers and children's clothing pay 5% and most goods pay 13%. In the US, grocery and clothing rates differ by state.
   - A per-item tax rate field was rejected for now. Users cannot fill it without AI. In the local data, at most 8 of 403 taxed receipts contain possible 5% items.
   - Workaround: edit the amounts of the `税` items by hand. Do not press 重新分摊税额 afterward.
