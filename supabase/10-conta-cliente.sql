-- Brokê: conta do cliente (cartões salvos e histórico). Rode depois do 09. É seguro repetir.

-- Perfil do cliente. Só o servidor lê e grava (guarda o código do cliente no Mercado Pago).
create table if not exists public.dl_clientes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  mp_customer_id text,
  nome text check (char_length(nome) <= 60),
  telefone text check (telefone is null or telefone ~ '^55[0-9]{10,11}$'),
  endereco text check (char_length(endereco) <= 120),
  bairro text check (char_length(bairro) <= 60),
  complemento text check (char_length(complemento) <= 60),
  criado_em timestamptz not null default now()
);
alter table public.dl_clientes enable row level security;
revoke all on public.dl_clientes from anon, authenticated;

-- Pedidos feitos com a conta aparecem no histórico, em qualquer aparelho.
alter table public.dl_pedidos add column if not exists cliente_user_id uuid references auth.users (id) on delete set null;
create index if not exists dl_pedidos_cliente_idx on public.dl_pedidos (cliente_user_id, criado_em desc) where cliente_user_id is not null;
