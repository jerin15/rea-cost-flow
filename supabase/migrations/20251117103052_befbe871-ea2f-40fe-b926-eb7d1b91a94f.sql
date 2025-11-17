-- Remove admin quotation configuration fields as they're no longer needed
ALTER TABLE cost_sheet_items 
DROP COLUMN IF EXISTS admin_chosen_supplier_id,
DROP COLUMN IF EXISTS admin_chosen_misc_supplier_id,
DROP COLUMN IF EXISTS admin_chosen_supplier_cost,
DROP COLUMN IF EXISTS admin_chosen_misc_cost,
DROP COLUMN IF EXISTS admin_chosen_total_cost,
DROP COLUMN IF EXISTS admin_chosen_rea_margin,
DROP COLUMN IF EXISTS admin_chosen_actual_quoted,
DROP COLUMN IF EXISTS admin_chosen_for_quotation,
DROP COLUMN IF EXISTS admin_quotation_notes;