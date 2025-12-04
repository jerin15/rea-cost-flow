-- Add parent_supplier_id to link misc suppliers to their parent product supplier
ALTER TABLE public.cost_sheet_item_suppliers 
ADD COLUMN parent_supplier_id uuid REFERENCES public.cost_sheet_item_suppliers(id) ON DELETE CASCADE;

-- Add index for faster queries
CREATE INDEX idx_cost_sheet_item_suppliers_parent ON public.cost_sheet_item_suppliers(parent_supplier_id);