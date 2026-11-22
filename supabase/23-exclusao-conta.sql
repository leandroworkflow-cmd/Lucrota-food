-- Brokê: pedidos de exclusão de conta (exigência da App Store). Contas só de cliente são apagadas na hora; lojistas e entregadores viram pedido para o admin conferir saldo e pedidos. Rode depois do 22. É seguro repetir.
create table if not exists public.dl_exclusoes (
  user_id uuid primary key,
  email text,
  papel text not null,
  status text not null default 'pendente' check (status in ('pendente', 'concluida')),
  criado_em timestamptz not null default now()
);
alter table public.dl_exclusoes enable row level security;
revoke all on public.dl_exclusoes from anon, authenticated;
