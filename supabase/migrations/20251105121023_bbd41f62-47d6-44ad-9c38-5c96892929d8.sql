-- Remove photo_url column as it's no longer needed
ALTER TABLE public.cost_sheet_items DROP COLUMN IF EXISTS photo_url;