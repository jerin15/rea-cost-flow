-- Add misc supplier field and REA margin percentage to cost_sheet_items
ALTER TABLE public.cost_sheet_items 
ADD COLUMN misc_supplier_id uuid REFERENCES public.suppliers(id),
ADD COLUMN rea_margin_percentage numeric DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.cost_sheet_items.misc_supplier_id IS 'Supplier for misc work (printing, finishing, etc.)';
COMMENT ON COLUMN public.cost_sheet_items.rea_margin_percentage IS 'REA margin as percentage of supplier cost';