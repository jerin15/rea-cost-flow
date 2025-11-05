-- Add photo_url column to cost_sheet_items table
ALTER TABLE public.cost_sheet_items
ADD COLUMN photo_url text;

-- Create storage bucket for product photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-photos', 'product-photos', true);

-- Create storage policies for product photos
CREATE POLICY "Anyone authenticated can view product photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Estimators can upload product photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-photos' AND has_role(auth.uid(), 'estimator'::app_role));

CREATE POLICY "Estimators can update product photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-photos' AND has_role(auth.uid(), 'estimator'::app_role));

CREATE POLICY "Estimators can delete product photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-photos' AND has_role(auth.uid(), 'estimator'::app_role));