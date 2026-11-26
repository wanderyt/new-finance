"use client";

import { splitTaxLines } from "../../lib/utils/tax-split";
import Button from "../ui-kit/Button";
import type { LineItem } from "./LineItemEditor";

interface ResplitTaxButtonProps {
  items: LineItem[];
  record: { category?: string; subcategory?: string };
  onSplit: (items: LineItem[]) => void;
}

// Splits the tax total again from the current item categories and 计税 / 免税 choices.
export default function ResplitTaxButton({ items, record, onSplit }: ResplitTaxButtonProps) {
  if (!items.some((item) => item.taxStatus === "tax")) return null;
  return (
    <Button type="button" variant="secondary" size="sm" className="shrink-0" title="按当前分类和计税商品重新拆分税额"
      onClick={() => onSplit(splitTaxLines(items, record))}>
      重新分摊税额
    </Button>
  );
}
