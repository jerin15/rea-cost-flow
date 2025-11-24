-- Add approval status to cost_sheet_item_suppliers to track individual supplier approvals
ALTER TABLE public.cost_sheet_item_suppliers 
ADD COLUMN approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Add approved_by and approved_at columns to track who approved and when
ALTER TABLE public.cost_sheet_item_suppliers 
ADD COLUMN approved_by uuid REFERENCES auth.users(id),
ADD COLUMN approved_at timestamp with time zone;