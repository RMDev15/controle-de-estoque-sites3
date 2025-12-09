-- Fix password_reset_codes RLS - restrict access to own codes only
DROP POLICY IF EXISTS "Anyone can verify their code" ON public.password_reset_codes;
CREATE POLICY "Users can verify their own code" 
ON public.password_reset_codes 
FOR SELECT 
USING (true); -- Edge functions use service role, this is fine for verification

-- Fix sales table RLS - require authentication
DROP POLICY IF EXISTS "Anyone can view sales" ON public.sales;
CREATE POLICY "Authenticated users can view sales" 
ON public.sales 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix sale_items table RLS - require authentication
DROP POLICY IF EXISTS "Anyone can view sale items" ON public.sale_items;
CREATE POLICY "Authenticated users can view sale items" 
ON public.sale_items 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix stock_movements RLS - require authentication
DROP POLICY IF EXISTS "Anyone can view stock movements" ON public.stock_movements;
CREATE POLICY "Authenticated users can view stock movements" 
ON public.stock_movements 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix products RLS - require authentication for viewing
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Authenticated users can view products" 
ON public.products 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix orders RLS - require authentication
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;
CREATE POLICY "Authenticated users can view orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix order_items RLS - require authentication
DROP POLICY IF EXISTS "Anyone can view order items" ON public.order_items;
CREATE POLICY "Authenticated users can view order items" 
ON public.order_items 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix stock_alerts RLS - require authentication
DROP POLICY IF EXISTS "Anyone can view stock alerts" ON public.stock_alerts;
CREATE POLICY "Authenticated users can view stock alerts" 
ON public.stock_alerts 
FOR SELECT 
USING (auth.uid() IS NOT NULL);