-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('estimator', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view clients"
  ON public.clients FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Estimator can create clients"
  ON public.clients FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'estimator'));

CREATE POLICY "Estimator can update clients"
  ON public.clients FOR UPDATE
  USING (public.has_role(auth.uid(), 'estimator'));

-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view suppliers"
  ON public.suppliers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Estimator can manage suppliers"
  ON public.suppliers FOR ALL
  USING (public.has_role(auth.uid(), 'estimator'));

-- Create cost_sheets table
CREATE TABLE public.cost_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT DEFAULT 'draft' NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.cost_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view cost sheets"
  ON public.cost_sheets FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Estimator can create cost sheets"
  ON public.cost_sheets FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'estimator'));

CREATE POLICY "Estimator can update cost sheets"
  ON public.cost_sheets FOR UPDATE
  USING (public.has_role(auth.uid(), 'estimator'));

-- Create enum for approval status
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved_admin_a', 'approved_admin_b', 'approved_both', 'rejected');

-- Create cost_sheet_items table
CREATE TABLE public.cost_sheet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_sheet_id UUID REFERENCES public.cost_sheets(id) ON DELETE CASCADE NOT NULL,
  item_number INTEGER NOT NULL,
  date DATE NOT NULL,
  item TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  qty NUMERIC(10, 2) NOT NULL DEFAULT 1,
  supplier_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
  misc_cost NUMERIC(10, 2) DEFAULT 0,
  misc_cost_type TEXT,
  total_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
  rea_margin NUMERIC(10, 2) NOT NULL DEFAULT 0,
  actual_quoted NUMERIC(10, 2) NOT NULL DEFAULT 0,
  approval_status approval_status DEFAULT 'pending' NOT NULL,
  admin_remarks TEXT,
  approved_by_admin_a BOOLEAN DEFAULT FALSE,
  approved_by_admin_b BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.cost_sheet_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view cost sheet items"
  ON public.cost_sheet_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Estimator can create cost sheet items"
  ON public.cost_sheet_items FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'estimator'));

CREATE POLICY "Estimator can update cost sheet items"
  ON public.cost_sheet_items FOR UPDATE
  USING (public.has_role(auth.uid(), 'estimator'));

CREATE POLICY "Admins can update cost sheet items"
  ON public.cost_sheet_items FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cost_sheets_updated_at
  BEFORE UPDATE ON public.cost_sheets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cost_sheet_items_updated_at
  BEFORE UPDATE ON public.cost_sheet_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();