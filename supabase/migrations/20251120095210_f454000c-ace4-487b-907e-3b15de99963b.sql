-- Add quoted_price and markup_percentage to cost_sheet_item_suppliers
ALTER TABLE cost_sheet_item_suppliers 
ADD COLUMN IF NOT EXISTS quoted_price numeric DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS markup_percentage numeric DEFAULT 0 NOT NULL;

-- Update existing records to have default values
UPDATE cost_sheet_item_suppliers 
SET quoted_price = 0, markup_percentage = 0 
WHERE quoted_price IS NULL OR markup_percentage IS NULL;