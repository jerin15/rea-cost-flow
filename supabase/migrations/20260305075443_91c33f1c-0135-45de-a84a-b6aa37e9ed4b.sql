
-- Allow estimators to create suppliers (they already have ALL but let's ensure INSERT specifically)
-- Allow estimators to update suppliers
CREATE POLICY "Estimator can update suppliers"
ON public.suppliers
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'estimator'::app_role));
