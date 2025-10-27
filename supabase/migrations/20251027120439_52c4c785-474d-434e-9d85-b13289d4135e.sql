-- Add misc_qty field to cost_sheet_items table
ALTER TABLE public.cost_sheet_items
ADD COLUMN misc_qty numeric DEFAULT 1;