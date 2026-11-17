-- Rode no Supabase: SQL Editor > New query > Run (é seguro repetir).
-- Pode ser o mesmo projeto do Lucrota: as tabelas daqui começam com dl_.

-- ===== Lojas =====
create table if not exists public.dl_lojas (
  id uuid primary key default gen_random_uuid(),
  dono_id uuid not null references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 40),
  descricao text check (char_length(descricao) <= 200),
  categoria text check (char_length(categoria) <= 30),
  whatsapp text not null check (whatsapp ~ '^55[0-9]{10,11}$'),
  endereco text check (char_length(endereco) <= 120),
  bairro text check (char_length(bairro) <= 60),
  cidade text check (char_length(cidade) <= 60),
  taxa_entrega numeric not null default 0 check (taxa_entrega >= 0 and taxa_entrega <= 100),
  pedido_minimo numeric not null default 0 check (pedido_minimo >= 0 and pedido_minimo <= 1000),
  tempo_estimado text check (char_length(tempo_estimado) <= 20),
  aberta boolean not null default false,
  ativa boolean not null default false,          -- liberada por você (admin)
  comissao_pct numeric not null default 10 check (comissao_pct >= 0 and comissao_pct <= 50),
  criado_em timestamptz not null default now()
);
-- Uma loja por dono, por enquanto
create unique index if not exists dl_lojas_dono_idx on public.dl_lojas (dono_id);

-- ===== Produtos =====
create table if not exists public.dl_produtos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.dl_lojas (id) on delete cascade,
  categoria text not null default 'Geral' check (char_length(categoria) <= 30),
  nome text not null check (char_length(nome) between 2 and 80),
  descricao text check (char_length(descricao) <= 160),
  preco numeric not null check (preco >= 0 and preco <= 5000),
  ativo boolean not null default true,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);
create index if not exists dl_produtos_loja_idx on public.dl_produtos (loja_id, ordem);

-- ===== Pedidos (criados só pelo servidor) =====
create table if not exists public.dl_pedidos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,
  token uuid not null unique default gen_random_uuid(),
  loja_id uuid not null references public.dl_lojas (id) on delete cascade,
  cliente_nome text not null,
  cliente_telefone text not null,
  endereco text not null,
  bairro text,
  complemento text,
  forma_pagamento text not null check (forma_pagamento in ('pix', 'dinheiro', 'cartao')),
  troco_para numeric,
  observacao text,
  itens jsonb not null,
  subtotal numeric not null,
  taxa_entrega numeric not null,
  total numeric not null,
  comissao_pct numeric not null,
  comissao_valor numeric not null,
  status text not null default 'novo' check (status in ('novo', 'aceito', 'preparo', 'saiu', 'entregue', 'cancelado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists dl_pedidos_loja_idx on public.dl_pedidos (loja_id, criado_em desc);

-- ===== Avisos no celular da loja (só o servidor lê/grava) =====
create table if not exists public.dl_push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  criado_em timestamptz not null default now()
);
create index if not exists dl_push_user_idx on public.dl_push_inscricoes (user_id);

-- ===== Segurança por linha =====
alter table public.dl_lojas enable row level security;
alter table public.dl_produtos enable row level security;
alter table public.dl_pedidos enable row level security;
alter table public.dl_push_inscricoes enable row level security;

-- Lojas: o dono vê e edita a própria. O público lê pelo servidor (service role).
drop policy if exists "dono le a propria loja" on public.dl_lojas;
create policy "dono le a propria loja" on public.dl_lojas for select using (dono_id = auth.uid());
drop policy if exists "dono cria a propria loja" on public.dl_lojas;
create policy "dono cria a propria loja" on public.dl_lojas for insert with check (dono_id = auth.uid());
drop policy if exists "dono edita a propria loja" on public.dl_lojas;
create policy "dono edita a propria loja" on public.dl_lojas for update
  using (dono_id = auth.uid()) with check (dono_id = auth.uid());

-- Produtos: só o dono da loja mexe.
drop policy if exists "dono gerencia produtos" on public.dl_produtos;
create policy "dono gerencia produtos" on public.dl_produtos for all
  using (exists (select 1 from public.dl_lojas l where l.id = loja_id and l.dono_id = auth.uid()))
  with check (exists (select 1 from public.dl_lojas l where l.id = loja_id and l.dono_id = auth.uid()));

-- Pedidos: o dono lê e só muda o status.
drop policy if exists "dono le pedidos" on public.dl_pedidos;
create policy "dono le pedidos" on public.dl_pedidos for select
  using (exists (select 1 from public.dl_lojas l where l.id = loja_id and l.dono_id = auth.uid()));
drop policy if exists "dono muda status" on public.dl_pedidos;
create policy "dono muda status" on public.dl_pedidos for update
  using (exists (select 1 from public.dl_lojas l where l.id = loja_id and l.dono_id = auth.uid()))
  with check (exists (select 1 from public.dl_lojas l where l.id = loja_id and l.dono_id = auth.uid()));

-- ===== Permissões por coluna (o dono NÃO pode se liberar nem mudar a própria comissão) =====
revoke all on public.dl_lojas from anon, authenticated;
grant select on public.dl_lojas to authenticated;
grant insert (dono_id, nome, slug, descricao, categoria, whatsapp, endereco, bairro, cidade,
              taxa_entrega, pedido_minimo, tempo_estimado) on public.dl_lojas to authenticated;
grant update (nome, descricao, categoria, whatsapp, endereco, bairro, cidade,
              taxa_entrega, pedido_minimo, tempo_estimado, aberta) on public.dl_lojas to authenticated;

revoke all on public.dl_produtos from anon;
grant select, insert, update, delete on public.dl_produtos to authenticated;

revoke all on public.dl_pedidos from anon, authenticated;
grant select on public.dl_pedidos to authenticated;
grant update (status, atualizado_em) on public.dl_pedidos to authenticated;

revoke all on public.dl_push_inscricoes from anon, authenticated;

-- ===== Para liberar uma loja e definir a comissão (você, no SQL Editor) =====
-- update public.dl_lojas set ativa = true, comissao_pct = 10 where slug = 'nome-da-loja';
