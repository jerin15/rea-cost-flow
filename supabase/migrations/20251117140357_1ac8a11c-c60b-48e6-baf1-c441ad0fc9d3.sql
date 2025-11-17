-- Create a new table to store multiple suppliers per cost sheet item
CREATE TABLE public.cost_sheet_item_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cost_sheet_item_id UUID NOT NULL REFERENCES public.cost_sheet_items(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  supplier_type TEXT NOT NULL CHECK (supplier_type IN ('product', 'misc')),
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  qty NUMERIC NOT NULL DEFAULT 1,
  description TEXT,
  selected_by_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cost_sheet_item_suppliers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cost_sheet_item_suppliers
CREATE POLICY "Anyone authenticated can view item suppliers"
ON public.cost_sheet_item_suppliers
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Estimator can create item suppliers"
ON public.cost_sheet_item_suppliers
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'estimator'::app_role));

CREATE POLICY "Estimator can update item suppliers"
ON public.cost_sheet_item_suppliers
FOR UPDATE
USING (has_role(auth.uid(), 'estimator'::app_role));

CREATE POLICY "Estimator can delete item suppliers"
ON public.cost_sheet_item_suppliers
FOR DELETE
USING (has_role(auth.uid(), 'estimator'::app_role));

CREATE POLICY "Admins can update item suppliers"
ON public.cost_sheet_item_suppliers
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete item suppliers"
ON public.cost_sheet_item_suppliers
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for better query performance
CREATE INDEX idx_cost_sheet_item_suppliers_item_id ON public.cost_sheet_item_suppliers(cost_sheet_item_id);
CREATE INDEX idx_cost_sheet_item_suppliers_supplier_id ON public.cost_sheet_item_suppliers(supplier_id);

-- Add trigger for updated_at
CREATE TRIGGER update_cost_sheet_item_suppliers_updated_at
BEFORE UPDATE ON public.cost_sheet_item_suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing data from cost_sheet_items to the new table
-- Insert product suppliers
INSERT INTO public.cost_sheet_item_suppliers (
  cost_sheet_item_id,
  supplier_id,
  supplier_type,
  unit_cost,
  qty,
  selected_by_admin
)
SELECT 
  id,
  supplier_id,
  'product',
  supplier_cost,
  qty,
  true -- Mark existing as selected since they were the only option
FROM public.cost_sheet_items
WHERE supplier_id IS NOT NULL;

-- Insert misc suppliers
INSERT INTO public.cost_sheet_item_suppliers (
  cost_sheet_item_id,
  supplier_id,
  supplier_type,
  unit_cost,
  qty,
  description,
  selected_by_admin
)
SELECT 
  id,
  misc_supplier_id,
  'misc',
  misc_cost,
  misc_qty,
  misc_description,
  true -- Mark existing as selected since they were the only option
FROM public.cost_sheet_items
WHERE misc_supplier_id IS NOT NULL;