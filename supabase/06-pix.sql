-- MeuDelivery: Pix pelo app com Mercado Pago. Rode depois dos anteriores. É seguro repetir.

-- ===== Conta Mercado Pago de cada loja (SÓ o servidor lê: guarda o token de recebimento) =====
create table if not exists public.dl_mp_contas (
  loja_id uuid primary key references public.dl_lojas (id) on delete cascade,
  mp_user_id text not null,
  access_token text not null,
  refresh_token text,
  public_key text,
  expira_em timestamptz,
  conectado_em timestamptz not null default now()
);
alter table public.dl_mp_contas enable row level security;
revoke all on public.dl_mp_contas from anon, authenticated;

-- A loja só vê se está conectada (coluna marcada pelo servidor; o dono não consegue alterar)
alter table public.dl_lojas add column if not exists aceita_pix_app boolean not null default false;

-- ===== Pedidos: pagamento online =====
alter table public.dl_pedidos drop constraint if exists dl_pedidos_forma_pagamento_check;
alter table public.dl_pedidos add constraint dl_pedidos_forma_pagamento_check
  check (forma_pagamento in ('pix', 'dinheiro', 'cartao', 'pix_app'));
alter table public.dl_pedidos add column if not exists pagamento_status text
  check (pagamento_status in ('pendente', 'pago', 'expirado', 'reembolsado'));
alter table public.dl_pedidos add column if not exists mp_payment_id text;
alter table public.dl_pedidos add column if not exists pix_copia_cola text;
alter table public.dl_pedidos add column if not exists pix_qr_base64 text;
alter table public.dl_pedidos add column if not exists pix_expira_em timestamptz;
alter table public.dl_pedidos add column if not exists taxa_plataforma numeric;   -- o que a plataforma reteve no Pix (comissão + taxa de entrega)
alter table public.dl_pedidos add column if not exists pago_em timestamptz;
create index if not exists dl_pedidos_mp_idx on public.dl_pedidos (mp_payment_id) where mp_payment_id is not null;

-- ===== Repasses: dinheiro que a plataforma reteve e deve a alguém (taxa de entrega) =====
create table if not exists public.dl_repasses (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null unique references public.dl_pedidos (id) on delete cascade,
  tipo text not null check (tipo in ('entregador', 'loja')),
  entregador_id uuid references public.dl_entregadores (id) on delete set null,
  loja_id uuid references public.dl_lojas (id) on delete cascade,
  valor numeric not null check (valor >= 0),
  status text not null default 'a_pagar' check (status in ('a_pagar', 'pago')),
  criado_em timestamptz not null default now(),
  pago_em timestamptz
);
create index if not exists dl_repasses_entregador_idx on public.dl_repasses (entregador_id, status);
alter table public.dl_repasses enable row level security;
drop policy if exists "entregador ve os proprios repasses" on public.dl_repasses;
create policy "entregador ve os proprios repasses" on public.dl_repasses for select
  using (entregador_id in (select id from public.dl_entregadores where user_id = auth.uid()));
drop policy if exists "loja ve os proprios repasses" on public.dl_repasses;
create policy "loja ve os proprios repasses" on public.dl_repasses for select
  using (loja_id in (select id from public.dl_lojas where dono_id = auth.uid()));
revoke all on public.dl_repasses from anon, authenticated;
grant select on public.dl_repasses to authenticated;

-- ===== Como marcar repasses como pagos (você, depois de mandar o Pix ao entregador) =====
-- update public.dl_repasses set status = 'pago', pago_em = now()
--   where status = 'a_pagar' and entregador_id = (select id from public.dl_entregadores where telefone = '5531999990000');
