-- MeuDelivery: tudo de uma vez (tabelas, fotos e loja de exemplo).
-- Antes: entre uma vez no /painel do site com o seu Google. Depois cole este arquivo inteiro no SQL Editor e clique em Run.

-- ===== entrega-local.sql =====
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

-- ===== 02-imagens.sql =====
-- Atualização 2: fotos (logo, capa e foto de cada item). Rode no SQL Editor (é seguro repetir).

alter table public.dl_lojas add column if not exists logo_url text check (char_length(logo_url) <= 500 and logo_url ~ '^https://');
alter table public.dl_lojas add column if not exists capa_url text check (char_length(capa_url) <= 500 and capa_url ~ '^https://');
alter table public.dl_produtos add column if not exists imagem_url text check (char_length(imagem_url) <= 500 and imagem_url ~ '^https://');

-- O dono pode preencher as novas colunas (as permissões por coluna precisam listá-las)
grant insert (logo_url, capa_url) on public.dl_lojas to authenticated;
grant update (logo_url, capa_url) on public.dl_lojas to authenticated;

-- Pasta pública de fotos. Cada loja só envia para a própria pasta (nome = id do usuário).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dl-imagens', 'dl-imagens', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "dl imagens: dono envia" on storage.objects;
create policy "dl imagens: dono envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'dl-imagens' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "dl imagens: dono troca" on storage.objects;
create policy "dl imagens: dono troca" on storage.objects for update to authenticated
  using (bucket_id = 'dl-imagens' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "dl imagens: dono apaga" on storage.objects;
create policy "dl imagens: dono apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'dl-imagens' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===== 03-loja-exemplo.sql =====
-- Loja de EXEMPLO para a página inicial não ficar vazia (e para você testar o pedido).
-- 1) A loja fica na conta que entrou por último no painel (entre no /painel com o seu Google antes de rodar).
-- 2) Rode no SQL Editor. Cada conta tem uma loja só: para cadastrar a sua loja de verdade,
--    primeiro apague a de exemplo com o comando que está no fim deste arquivo.

with dono as (
  select id from auth.users order by last_sign_in_at desc nulls last limit 1
), loja as (
  insert into public.dl_lojas
    (dono_id, nome, slug, descricao, categoria, whatsapp, endereco, bairro, cidade,
     taxa_entrega, pedido_minimo, tempo_estimado, aberta, ativa, comissao_pct)
  select id, 'Lanchonete Exemplo', 'lanchonete-exemplo',
         'Loja de exemplo para testar o pedido. Hambúrguer artesanal, porções e bebidas geladas.',
         'Lanches', '5531999990000', 'Rua Exemplo, 100', 'Centro', 'Santa Luzia',
         6, 20, '30-45 min', true, true, 10
  from dono
  on conflict (slug) do update set aberta = true, ativa = true
  returning id
)
insert into public.dl_produtos (loja_id, categoria, nome, descricao, preco, ordem)
select loja.id, p.categoria, p.nome, p.descricao, p.preco, p.ordem
from loja, (values
  ('Lanches', 'X-Burger',            'Pão, hambúrguer 150 g, queijo, alface e tomate', 25.50, 1),
  ('Lanches', 'X-Bacon',             'Hambúrguer, bacon crocante, queijo e maionese da casa', 29.90, 2),
  ('Lanches', 'X-Salada Duplo',      'Dois hambúrgueres, queijo, alface, tomate e cebola', 34.00, 3),
  ('Porções', 'Batata frita',        'Porção de 400 g, crocante e sequinha', 22.00, 1),
  ('Porções', 'Onion rings',         'Anéis de cebola empanados, 300 g', 24.00, 2),
  ('Bebidas', 'Refrigerante lata',   '350 ml, bem gelado', 7.00, 1),
  ('Bebidas', 'Suco natural',        'Laranja ou maracujá, 400 ml', 9.00, 2),
  ('Sobremesas', 'Milkshake',        'Chocolate, morango ou ovomaltine, 400 ml', 16.00, 1)
) as p(categoria, nome, descricao, preco, ordem)
where not exists (select 1 from public.dl_produtos x where x.loja_id = loja.id);

-- Para APAGAR a loja de exemplo depois:
-- delete from public.dl_lojas where slug = 'lanchonete-exemplo';

-- ===== 04-entregas.sql =====
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

-- ===== 05-avisos.sql =====
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
