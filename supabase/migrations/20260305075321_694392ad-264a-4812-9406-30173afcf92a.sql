
-- Allow admins to create clients
CREATE POLICY "Admins can create clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update clients
CREATE POLICY "Admins can update clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to create suppliers
CREATE POLICY "Admins can create suppliers"
ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update suppliers
CREATE POLICY "Admins can update suppliers"
ON public.suppliers
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
