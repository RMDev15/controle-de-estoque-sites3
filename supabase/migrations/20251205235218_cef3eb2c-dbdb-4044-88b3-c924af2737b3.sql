-- Adicionar colunas de fornecedor e contato na tabela orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS fornecedor TEXT,
ADD COLUMN IF NOT EXISTS contato_fornecedor TEXT;