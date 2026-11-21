-- Brokê: resposta do entregador a cada corrida oferecida (para taxa de aceitação e de finalização). Rode depois do 16. É seguro repetir.
create table if not exists public.dl_ofertas (
  entregador_id uuid not null references public.dl_entregadores (id) on delete cascade,
  pedido_id uuid not null references public.dl_pedidos (id) on delete cascade,
  resposta text not null check (resposta in ('aceita', 'recusada', 'expirada', 'concluida', 'desistida')),
  atualizado_em timestamptz not null default now(),
  primary key (entregador_id, pedido_id)
);
create index if not exists dl_ofertas_ent_idx on public.dl_ofertas (entregador_id, atualizado_em desc);
alter table public.dl_ofertas enable row level security;
revoke all on public.dl_ofertas from anon, authenticated;
