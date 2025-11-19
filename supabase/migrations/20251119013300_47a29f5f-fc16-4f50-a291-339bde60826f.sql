-- Tornar o primeiro usuário em admin master
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role 
FROM public.profiles 
WHERE email = 'ramonmatos390@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;