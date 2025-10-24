-- Allow authenticated users to create notifications for others
-- This is needed for the approval workflow where admins notify estimators and vice versa
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add index for better performance on notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at 
ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_read 
ON public.notifications(user_id, read) WHERE read = false;