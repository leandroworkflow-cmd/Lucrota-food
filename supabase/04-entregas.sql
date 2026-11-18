-- MeuDelivery: entregadores + GPS (mapa gratuito). Rode depois dos arquivos anteriores. É seguro repetir.

-- ===== Lojas: localização e convite de entregadores =====
alter table public.dl_lojas add column if not exists lat double precision;
alter table public.dl_lojas add column if not exists lng double precision;
alter table public.dl_lojas add column if not exists aceita_plataforma boolean not null default true;
alter table public.dl_lojas add column if not exists codigo_entregador text;
update public.dl_lojas set codigo_entregador = upper(substr(md5(gen_random_uuid()::text), 1, 6)) where codigo_entregador is null;
alter table public.dl_lojas alter column codigo_entregador set default upper(substr(md5(gen_random_uuid()::text), 1, 6));
create unique index if not exists dl_lojas_codigo_idx on public.dl_lojas (codigo_entregador);
alter table public.dl_lojas drop constraint if exists dl_lojas_geo_check;
alter table public.dl_lojas add constraint dl_lojas_geo_check
  check ((lat is null or lat between -90 and 90) and (lng is null or lng between -180 and 180));

grant insert (lat, lng, aceita_plataforma) on public.dl_lojas to authenticated;
grant update (lat, lng, aceita_plataforma) on public.dl_lojas to authenticated;

-- ===== Entregadores =====
create table if not exists public.dl_entregadores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 60),
  telefone text not null check (telefone ~ '^55[0-9]{10,11}$'),
  veiculo text not null default 'moto' check (veiculo in ('moto', 'bicicleta', 'carro', 'a_pe')),
  loja_id uuid references public.dl_lojas (id) on delete set null,  -- preenchido = entregador exclusivo dessa loja
  aprovado boolean not null default false,                          -- entregador da plataforma: liberado por você
  online boolean not null default false,
  criado_em timestamptz not null default now()
);

-- Última posição de cada entregador (uma linha só, atualizada durante a entrega)
create table if not exists public.dl_localizacoes (
  entregador_id uuid primary key references public.dl_entregadores (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  precisao real,
  atualizado_em timestamptz not null default now()
);

-- ===== Pedidos: entrega =====
alter table public.dl_pedidos add column if not exists entregador_id uuid references public.dl_entregadores (id) on delete set null;
alter table public.dl_pedidos add column if not exists entrega text check (entrega in ('procurando', 'aceita'));
alter table public.dl_pedidos add column if not exists destino_lat double precision;
alter table public.dl_pedidos add column if not exists destino_lng double precision;
alter table public.dl_pedidos add column if not exists coletado_em timestamptz;
alter table public.dl_pedidos add column if not exists entregue_em timestamptz;
create index if not exists dl_pedidos_entrega_idx on public.dl_pedidos (entrega) where entrega is not null;

-- ===== Segurança por linha =====
alter table public.dl_entregadores enable row level security;
alter table public.dl_localizacoes enable row level security;

drop policy if exists "entregador le o proprio cadastro" on public.dl_entregadores;
create policy "entregador le o proprio cadastro" on public.dl_entregadores for select using (user_id = auth.uid());
drop policy if exists "entregador muda o proprio online" on public.dl_entregadores;
create policy "entregador muda o proprio online" on public.dl_entregadores for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "entregador grava a propria posicao" on public.dl_localizacoes;
create policy "entregador grava a propria posicao" on public.dl_localizacoes for all
  using (entregador_id in (select id from public.dl_entregadores where user_id = auth.uid()))
  with check (entregador_id in (select id from public.dl_entregadores where user_id = auth.uid()));

revoke all on public.dl_entregadores from anon, authenticated;
grant select on public.dl_entregadores to authenticated;
grant update (online) on public.dl_entregadores to authenticated;   -- cadastro e demais dados: só pelo servidor

revoke all on public.dl_localizacoes from anon, authenticated;
grant select, insert, update on public.dl_localizacoes to authenticated;

-- ===== Como liberar um entregador da plataforma (rode no SQL Editor) =====
-- update public.dl_entregadores set aprovado = true where telefone = '5531999990000';
