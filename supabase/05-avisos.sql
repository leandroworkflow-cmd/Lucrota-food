-- MeuDelivery: avisos no celular para clientes (sem conta, presos ao pedido). Seguro repetir.
create table if not exists public.dl_push_clientes (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.dl_pedidos (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  criado_em timestamptz not null default now()
);
create index if not exists dl_push_clientes_pedido_idx on public.dl_push_clientes (pedido_id);
alter table public.dl_push_clientes enable row level security;
revoke all on public.dl_push_clientes from anon, authenticated;  -- só o servidor lê e grava
