-- Allow estimators to delete cost sheet items
CREATE POLICY "Estimator can delete cost sheet items"
ON cost_sheet_items FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'estimator'::app_role)
);

-- Allow estimators to delete cost sheets
CREATE POLICY "Estimator can delete cost sheets"
ON cost_sheets FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'estimator'::app_role)
);

-- Allow estimators to delete suppliers
CREATE POLICY "Estimator can delete suppliers"
ON suppliers FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'estimator'::app_role)
);