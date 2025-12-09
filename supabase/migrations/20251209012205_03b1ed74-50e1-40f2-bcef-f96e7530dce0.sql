-- Drop the existing overly permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert stock movements" ON public.stock_movements;

-- Create a new policy that requires admin role or 'cadastro' permission for inserting stock movements
CREATE POLICY "Users with permission can insert stock movements"
ON public.stock_movements
FOR INSERT
WITH CHECK (
  has_admin_role(auth.uid()) OR 
  has_permission(auth.uid(), 'cadastro'::text)
);