
-- Inserir o usuário testhabboo@gmail.com como admin se não existir
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  is_admin,
  status,
  created_at,
  updated_at
) 
SELECT 
  auth_user.id,
  auth_user.email,
  COALESCE(auth_user.raw_user_meta_data->>'full_name', 'Admin User'),
  'admin',
  true,
  'active',
  NOW(),
  NOW()
FROM auth.users auth_user
WHERE auth_user.email = 'testhabboo@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE email = 'testhabboo@gmail.com'
);

-- Se o usuário já existir, apenas atualizar para admin
UPDATE public.profiles 
SET 
  role = 'admin',
  is_admin = true,
  status = 'active',
  updated_at = NOW()
WHERE email = 'testhabboo@gmail.com';
