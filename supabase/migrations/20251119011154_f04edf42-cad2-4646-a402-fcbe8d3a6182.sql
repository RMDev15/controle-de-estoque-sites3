-- Create enum types
CREATE TYPE app_role AS ENUM ('admin', 'common');
CREATE TYPE order_status AS ENUM ('emitido', 'em_transito', 'devolvido', 'cancelado', 'recebido');
CREATE TYPE alert_color AS ENUM ('verde', 'amarelo', 'vermelho', 'sem_cor');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  tipo_acesso app_role NOT NULL DEFAULT 'common',
  permissoes JSONB DEFAULT '{"cadastro": false, "terminal": false, "pedidos": false, "alertas": true, "gerenciar_usuario": false}'::jsonb,
  senha_temporaria BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  cor TEXT,
  estoque_atual INTEGER NOT NULL DEFAULT 0,
  valor_unitario DECIMAL(10,2) NOT NULL,
  valor_venda DECIMAL(10,2) NOT NULL,
  markup DECIMAL(5,2),
  foto_url TEXT,
  codigo_barras TEXT UNIQUE,
  fornecedor TEXT,
  estoque_baixo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  prazo_entrega_dias INTEGER,
  data_prevista_entrega DATE,
  status order_status NOT NULL DEFAULT 'emitido',
  alerta_cor alert_color DEFAULT 'sem_cor',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantidade INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales table
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  data_venda TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total DECIMAL(10,2) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sale_items table
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantidade INTEGER NOT NULL,
  valor_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stock_alerts table
CREATE TABLE public.stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nivel_verde_min INTEGER NOT NULL DEFAULT 500,
  nivel_verde_max INTEGER NOT NULL DEFAULT 1000,
  nivel_amarelo_min INTEGER NOT NULL DEFAULT 200,
  nivel_amarelo_max INTEGER NOT NULL DEFAULT 499,
  nivel_vermelho_max INTEGER NOT NULL DEFAULT 199,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stock_movements table for history
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL,
  quantidade INTEGER NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Create function to check if user has admin role
CREATE OR REPLACE FUNCTION public.has_admin_role(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = $1 AND user_roles.role = 'admin'
  );
$$;

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION public.has_permission(user_id UUID, permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (permissoes->>permission_name)::boolean 
     FROM public.profiles 
     WHERE id = $1),
    FALSE
  );
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_admin_role(auth.uid()));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_admin_role(auth.uid()));

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_admin_role(auth.uid()));

-- RLS Policies for user_roles
CREATE POLICY "Admins manage user roles"
  ON public.user_roles FOR ALL
  USING (public.has_admin_role(auth.uid()));

-- RLS Policies for products
CREATE POLICY "Anyone can view products"
  ON public.products FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users with permission can manage products"
  ON public.products FOR ALL
  USING (
    public.has_admin_role(auth.uid()) OR 
    public.has_permission(auth.uid(), 'cadastro')
  );

-- RLS Policies for orders
CREATE POLICY "Anyone can view orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users with permission can manage orders"
  ON public.orders FOR ALL
  USING (
    public.has_admin_role(auth.uid()) OR 
    public.has_permission(auth.uid(), 'pedidos')
  );

-- RLS Policies for order_items
CREATE POLICY "Anyone can view order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users with permission can manage order items"
  ON public.order_items FOR ALL
  USING (
    public.has_admin_role(auth.uid()) OR 
    public.has_permission(auth.uid(), 'pedidos')
  );

-- RLS Policies for sales
CREATE POLICY "Anyone can view sales"
  ON public.sales FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users with permission can manage sales"
  ON public.sales FOR ALL
  USING (
    public.has_admin_role(auth.uid()) OR 
    public.has_permission(auth.uid(), 'terminal')
  );

-- RLS Policies for sale_items (FIXED TYPO)
CREATE POLICY "Anyone can view sale items"
  ON public.sale_items FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users with permission can manage sale items"
  ON public.sale_items FOR ALL
  USING (
    public.has_admin_role(auth.uid()) OR 
    public.has_permission(auth.uid(), 'terminal')
  );

-- RLS Policies for stock_alerts
CREATE POLICY "Anyone can view stock alerts"
  ON public.stock_alerts FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users with permission can manage alerts"
  ON public.stock_alerts FOR ALL
  USING (
    public.has_admin_role(auth.uid()) OR 
    public.has_permission(auth.uid(), 'alertas')
  );

-- RLS Policies for stock_movements
CREATE POLICY "Anyone can view stock movements"
  ON public.stock_movements FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can insert stock movements"
  ON public.stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- Create trigger function for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, tipo_acesso)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    'common'
  );
  
  -- Add common role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'common');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER stock_alerts_updated_at
  BEFORE UPDATE ON public.stock_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();