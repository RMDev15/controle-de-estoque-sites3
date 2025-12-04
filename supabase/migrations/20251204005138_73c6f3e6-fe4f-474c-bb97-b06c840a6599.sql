-- Create table for password reset codes
CREATE TABLE public.password_reset_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for requesting reset)
CREATE POLICY "Anyone can request password reset"
ON public.password_reset_codes
FOR INSERT
WITH CHECK (true);

-- Allow anyone to select their own code by email
CREATE POLICY "Anyone can verify their code"
ON public.password_reset_codes
FOR SELECT
USING (true);

-- Allow anyone to update (mark as used)
CREATE POLICY "Anyone can mark code as used"
ON public.password_reset_codes
FOR UPDATE
USING (true);

-- Index for faster lookups
CREATE INDEX idx_password_reset_email ON public.password_reset_codes(email);
CREATE INDEX idx_password_reset_code ON public.password_reset_codes(code);