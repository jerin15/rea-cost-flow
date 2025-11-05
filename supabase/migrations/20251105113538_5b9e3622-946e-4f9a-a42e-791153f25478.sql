-- Add new fields for admin's alternate supplier choices and quotation tracking
ALTER TABLE public.cost_sheet_items
ADD COLUMN IF NOT EXISTS misc_type TEXT,
ADD COLUMN IF NOT EXISTS misc_description TEXT,
ADD COLUMN IF NOT EXISTS admin_chosen_supplier_id UUID REFERENCES public.suppliers(id),
ADD COLUMN IF NOT EXISTS admin_chosen_misc_supplier_id UUID REFERENCES public.suppliers(id),
ADD COLUMN IF NOT EXISTS admin_chosen_supplier_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS admin_chosen_misc_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS admin_chosen_total_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS admin_chosen_rea_margin NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS admin_chosen_actual_quoted NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS admin_chosen_for_quotation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_quotation_notes TEXT;