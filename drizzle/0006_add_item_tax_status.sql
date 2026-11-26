ALTER TABLE fin_items ADD COLUMN tax_status TEXT NOT NULL DEFAULT 'taxable'
  CHECK (tax_status IN ('taxable', 'exempt', 'tax'));
