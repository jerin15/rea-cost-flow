-- Add DELETE policies for admins on cost_sheet_items
CREATE POLICY "Admins can delete cost sheet items"
ON public.cost_sheet_items
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for admins on cost_sheets
CREATE POLICY "Admins can delete cost sheets"
ON public.cost_sheets
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for admins on suppliers
CREATE POLICY "Admins can delete suppliers"
ON public.suppliers
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));