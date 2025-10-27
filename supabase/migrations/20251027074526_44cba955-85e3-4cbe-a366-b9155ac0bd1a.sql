-- Drop and recreate foreign keys with proper CASCADE behavior

-- Fix suppliers -> clients relationship
ALTER TABLE public.suppliers 
DROP CONSTRAINT IF EXISTS suppliers_client_id_fkey;

ALTER TABLE public.suppliers
ADD CONSTRAINT suppliers_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- Fix cost_sheets -> clients relationship
ALTER TABLE public.cost_sheets 
DROP CONSTRAINT IF EXISTS cost_sheets_client_id_fkey;

ALTER TABLE public.cost_sheets
ADD CONSTRAINT cost_sheets_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- Fix cost_sheet_items -> cost_sheets relationship
ALTER TABLE public.cost_sheet_items 
DROP CONSTRAINT IF EXISTS cost_sheet_items_cost_sheet_id_fkey;

ALTER TABLE public.cost_sheet_items
ADD CONSTRAINT cost_sheet_items_cost_sheet_id_fkey 
FOREIGN KEY (cost_sheet_id) 
REFERENCES public.cost_sheets(id) 
ON DELETE CASCADE;

-- Fix cost_sheet_items -> suppliers relationship (SET NULL so items remain but supplier reference is removed)
ALTER TABLE public.cost_sheet_items 
DROP CONSTRAINT IF EXISTS cost_sheet_items_supplier_id_fkey;

ALTER TABLE public.cost_sheet_items
ADD CONSTRAINT cost_sheet_items_supplier_id_fkey 
FOREIGN KEY (supplier_id) 
REFERENCES public.suppliers(id) 
ON DELETE SET NULL;