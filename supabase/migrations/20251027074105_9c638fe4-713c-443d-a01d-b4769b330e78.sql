-- Add DELETE policy for estimators on clients
CREATE POLICY "Estimator can delete clients"
ON public.clients
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'estimator'::app_role));

-- Add DELETE policy for admins on clients
CREATE POLICY "Admins can delete clients"
ON public.clients
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));