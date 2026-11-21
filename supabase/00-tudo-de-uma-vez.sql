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

-- ===== 06-pix.sql =====
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

-- ===== 07-conta-corrente.sql =====
-- MeuDelivery: conta corrente (a plataforma recebe o Pix e repassa; no dinheiro, loja e entregador ficam devendo a parte da plataforma).
-- ANTES, rode o 06-pix.sql (cria as colunas do pagamento nos pedidos). É seguro repetir.

-- ===== Ajustes da plataforma (só o servidor lê) =====
create table if not exists public.dl_config (
  chave text primary key,
  valor numeric not null
);
insert into public.dl_config (chave, valor) values ('comissao_entrega_pct', 0) on conflict (chave) do nothing;
alter table public.dl_config enable row level security;
revoke all on public.dl_config from anon, authenticated;

-- ===== Pix pelo app agora vale para todas as lojas (a plataforma recebe). A coluna vira um "desligar" por loja. =====
alter table public.dl_lojas add column if not exists aceita_pix_app boolean not null default true;
alter table public.dl_lojas alter column aceita_pix_app set default true;
update public.dl_lojas set aceita_pix_app = true;

-- ===== Chave Pix de quem recebe repasses =====
alter table public.dl_lojas add column if not exists chave_pix text check (char_length(chave_pix) <= 140);
grant insert (chave_pix) on public.dl_lojas to authenticated;
grant update (chave_pix) on public.dl_lojas to authenticated;
alter table public.dl_entregadores add column if not exists chave_pix text check (char_length(chave_pix) <= 140);
grant update (online, chave_pix) on public.dl_entregadores to authenticated;

-- ===== Lançamentos: crédito (+) a plataforma deve; débito (-) a pessoa deve à plataforma =====
create table if not exists public.dl_lancamentos (
  id uuid primary key default gen_random_uuid(),
  conta_tipo text not null check (conta_tipo in ('loja', 'entregador')),
  loja_id uuid references public.dl_lojas (id) on delete cascade,
  entregador_id uuid references public.dl_entregadores (id) on delete cascade,
  pedido_id uuid references public.dl_pedidos (id) on delete set null,
  tipo text not null check (tipo in ('venda_pix', 'comissao', 'entrega_pix', 'comissao_entrega', 'acerto')),
  valor numeric not null,
  descricao text,
  criado_em timestamptz not null default now(),
  check (
    (conta_tipo = 'loja' and loja_id is not null and entregador_id is null)
    or (conta_tipo = 'entregador' and entregador_id is not null and loja_id is null)
  )
);
-- O mesmo pedido nunca lança duas vezes o mesmo item na mesma conta.
create unique index if not exists dl_lancamentos_unico on public.dl_lancamentos (pedido_id, tipo, conta_tipo);
create index if not exists dl_lancamentos_loja_idx on public.dl_lancamentos (loja_id, criado_em desc);
create index if not exists dl_lancamentos_entregador_idx on public.dl_lancamentos (entregador_id, criado_em desc);

alter table public.dl_lancamentos enable row level security;
drop policy if exists "loja ve a propria conta" on public.dl_lancamentos;
create policy "loja ve a propria conta" on public.dl_lancamentos for select
  using (loja_id in (select id from public.dl_lojas where dono_id = auth.uid()));
drop policy if exists "entregador ve a propria conta" on public.dl_lancamentos;
create policy "entregador ve a propria conta" on public.dl_lancamentos for select
  using (entregador_id in (select id from public.dl_entregadores where user_id = auth.uid()));
revoke all on public.dl_lancamentos from anon, authenticated;
grant select on public.dl_lancamentos to authenticated;   -- só leitura; quem grava é o servidor

-- ===== Para você (SQL Editor): saldos e acerto de contas =====
-- saldo > 0: a plataforma deve repassar por Pix.  saldo < 0: a pessoa deve à plataforma (cobre por Pix).
create or replace view public.dl_saldos as
  select 'loja'::text as conta, l.id, l.nome, l.chave_pix, coalesce(sum(x.valor), 0) as saldo
    from public.dl_lojas l left join public.dl_lancamentos x on x.loja_id = l.id group by l.id
  union all
  select 'entregador'::text, e.id, e.nome, e.chave_pix, coalesce(sum(x.valor), 0)
    from public.dl_entregadores e left join public.dl_lancamentos x on x.entregador_id = e.id group by e.id;
revoke all on public.dl_saldos from anon, authenticated;

-- Zera a conta depois que o Pix (de repasse ou de cobrança) foi feito. Devolve o saldo que foi acertado.
create or replace function public.dl_acertar(p_tipo text, p_id uuid, p_descricao text default 'Acerto de contas')
returns numeric language plpgsql as $$
declare v_saldo numeric;
begin
  if p_tipo = 'loja' then
    select coalesce(sum(valor), 0) into v_saldo from public.dl_lancamentos where loja_id = p_id;
    if v_saldo <> 0 then
      insert into public.dl_lancamentos (conta_tipo, loja_id, tipo, valor, descricao) values ('loja', p_id, 'acerto', -v_saldo, p_descricao);
    end if;
  elsif p_tipo = 'entregador' then
    select coalesce(sum(valor), 0) into v_saldo from public.dl_lancamentos where entregador_id = p_id;
    if v_saldo <> 0 then
      insert into public.dl_lancamentos (conta_tipo, entregador_id, tipo, valor, descricao) values ('entregador', p_id, 'acerto', -v_saldo, p_descricao);
    end if;
  else
    raise exception 'Use loja ou entregador';
  end if;
  return v_saldo;
end $$;
revoke all on function public.dl_acertar(text, uuid, text) from public, anon, authenticated;

-- ===== Exemplos de uso =====
-- select * from public.dl_saldos order by saldo;                       -- quem recebe e quem deve
-- select public.dl_acertar('loja', '00000000-0000-0000-0000-000000000000');
-- update public.dl_config set valor = 10 where chave = 'comissao_entrega_pct';   -- % que a plataforma retém da taxa de entrega


-- ===== 08-cartao.sql =====
-- A taxa do cartão do Mercado Pago é paga pela plataforma: não aparece em nenhuma conta corrente.

alter table public.dl_pedidos drop constraint if exists dl_pedidos_forma_pagamento_check;
alter table public.dl_pedidos add constraint dl_pedidos_forma_pagamento_check
  check (forma_pagamento in ('pix', 'dinheiro', 'cartao', 'pix_app', 'cartao_app'));

alter table public.dl_pedidos drop constraint if exists dl_pedidos_pagamento_status_check;
alter table public.dl_pedidos add constraint dl_pedidos_pagamento_status_check
  check (pagamento_status in ('pendente', 'pago', 'expirado', 'reembolsado', 'recusado'));


-- ===== 09-admin.sql =====

-- Acerta a conta SÓ se o saldo ainda é o que o administrador viu na tela (evita acertar um valor que mudou no meio).
-- p_valor: o saldo exibido (positivo = a plataforma pagou à pessoa; negativo = a pessoa pagou à plataforma).
create or replace function public.dl_acertar_exato(p_tipo text, p_id uuid, p_valor numeric, p_descricao text default 'Acerto de contas')
returns numeric language plpgsql as $$
declare v_saldo numeric;
begin
  perform pg_advisory_xact_lock(hashtext(p_id::text));
  if p_tipo = 'loja' then
    select coalesce(sum(valor), 0) into v_saldo from public.dl_lancamentos where loja_id = p_id;
  elsif p_tipo = 'entregador' then
    select coalesce(sum(valor), 0) into v_saldo from public.dl_lancamentos where entregador_id = p_id;
  else
    raise exception 'Use loja ou entregador';
  end if;
  if round(v_saldo, 2) <> round(p_valor, 2) then
    raise exception 'saldo_mudou';
  end if;
  if round(v_saldo, 2) = 0 then
    return 0;
  end if;
  if p_tipo = 'loja' then
    insert into public.dl_lancamentos (conta_tipo, loja_id, tipo, valor, descricao) values ('loja', p_id, 'acerto', -v_saldo, p_descricao);
  else
    insert into public.dl_lancamentos (conta_tipo, entregador_id, tipo, valor, descricao) values ('entregador', p_id, 'acerto', -v_saldo, p_descricao);
  end if;
  return v_saldo;
end $$;
revoke all on function public.dl_acertar_exato(text, uuid, numeric, text) from public, anon, authenticated;


-- ===== 10-conta-cliente.sql =====

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


-- ===== 11-chegada-loja.sql =====
alter table public.dl_pedidos add column if not exists chegou_loja_em timestamptz;   -- quando o entregador tocou em "Cheguei na loja"
alter table public.dl_pedidos add column if not exists entregador_nome text;          -- primeiro nome, para a loja ver quem vem buscar
alter table public.dl_pedidos add column if not exists entregador_veiculo text;


-- ===== 12-cancelamento.sql =====
alter table public.dl_pedidos add column if not exists preparo_em timestamptz;          -- quando a loja marcou "em preparo" (começa a janela grátis de 3 minutos)
alter table public.dl_pedidos add column if not exists cancelado_por text check (cancelado_por in ('cliente', 'loja'));
alter table public.dl_pedidos add column if not exists taxa_cancelamento numeric not null default 0;

alter table public.dl_pedidos drop constraint if exists dl_pedidos_pagamento_status_check;
alter table public.dl_pedidos add constraint dl_pedidos_pagamento_status_check
  check (pagamento_status in ('pendente', 'pago', 'expirado', 'reembolsado', 'recusado', 'reembolsado_parcial', 'cancelado'));

alter table public.dl_lancamentos drop constraint if exists dl_lancamentos_tipo_check;
alter table public.dl_lancamentos add constraint dl_lancamentos_tipo_check
  check (tipo in ('venda_pix', 'comissao', 'entrega_pix', 'comissao_entrega', 'acerto', 'taxa_cancelamento'));


-- ===== 13-codigo-entrega.sql =====
alter table public.dl_pedidos add column if not exists codigo_entrega text check (codigo_entrega ~ '^[0-9]{4}$');
alter table public.dl_pedidos add column if not exists tentativas_codigo int not null default 0;

-- Pedidos que já estão em andamento também ganham um código.
update public.dl_pedidos
   set codigo_entrega = lpad((floor(random() * 10000))::int::text, 4, '0')
 where codigo_entrega is null and status in ('novo', 'aceito', 'preparo', 'saiu');


-- ===== 14: documentos do entregador =====

alter table public.dl_entregadores add column if not exists docs_status text not null default 'sem_documentos';
alter table public.dl_entregadores drop constraint if exists dl_entregadores_docs_status_check;
alter table public.dl_entregadores add constraint dl_entregadores_docs_status_check
  check (docs_status in ('sem_documentos', 'em_analise', 'aprovado', 'reprovado'));
alter table public.dl_entregadores add column if not exists docs_motivo text;
alter table public.dl_entregadores add column if not exists cnh_nome text;
alter table public.dl_entregadores add column if not exists cnh_validade date;
alter table public.dl_entregadores add column if not exists cnh_categoria text;
alter table public.dl_entregadores add column if not exists placa text;
alter table public.dl_entregadores add column if not exists docs_enviados_em timestamptz;
alter table public.dl_entregadores add column if not exists docs_consentimento_em timestamptz;
alter table public.dl_entregadores add column if not exists docs_analise jsonb;  -- conferência automática (regras e, no futuro, IA)

-- Uma linha por arquivo enviado. O arquivo fica num bucket PRIVADO.
create table if not exists public.dl_documentos (
  id uuid primary key default gen_random_uuid(),
  entregador_id uuid not null references public.dl_entregadores (id) on delete cascade,
  tipo text not null check (tipo in ('cnh', 'crlv', 'selfie')),
  caminho text not null,
  criado_em timestamptz not null default now(),
  unique (entregador_id, tipo)
);
alter table public.dl_documentos enable row level security;
revoke all on public.dl_documentos from anon, authenticated;

-- Bucket privado, sem nenhuma política: só o servidor (service_role) lê e grava.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dl-documentos', 'dl-documentos', false, 3145728, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg'];

-- Entregadores da plataforma já aprovados antes desta regra precisam enviar os documentos.
update public.dl_entregadores
   set aprovado = false, online = false
 where loja_id is null and aprovado = true and docs_status <> 'aprovado';


-- ===== 15: endereço do entregador =====
alter table public.dl_entregadores add column if not exists endereco text;


-- ===== 16: CNPJ da loja =====
alter table public.dl_lojas add column if not exists cnpj text check (cnpj ~ '^[0-9]{14}$');
alter table public.dl_lojas add column if not exists razao_social text check (char_length(razao_social) <= 120);
alter table public.dl_lojas add column if not exists responsavel_nome text check (char_length(responsavel_nome) <= 80);
alter table public.dl_lojas add column if not exists responsavel_cpf text check (responsavel_cpf ~ '^[0-9]{11}$');
alter table public.dl_lojas add column if not exists termos_versao text;
alter table public.dl_lojas add column if not exists termos_aceitos_em timestamptz;

-- Um CNPJ não pode ter duas lojas.
create unique index if not exists dl_lojas_cnpj_idx on public.dl_lojas (cnpj) where cnpj is not null;

grant insert (cnpj, razao_social, responsavel_nome, responsavel_cpf, termos_versao) on public.dl_lojas to authenticated;
grant update (cnpj, razao_social, responsavel_nome, responsavel_cpf, termos_versao) on public.dl_lojas to authenticated;

-- A data do aceite é sempre a do servidor (o navegador não escolhe). Depois que a loja é aprovada, o CNPJ e o CPF não mudam sozinhos.
create or replace function public.dl_lojas_cnpj_guarda() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.ativa and old.cnpj is not null
     and (new.cnpj is distinct from old.cnpj or new.responsavel_cpf is distinct from old.responsavel_cpf) then
    raise exception 'CNPJ e CPF não podem ser alterados depois da aprovação. Fale com o suporte.';
  end if;
  if new.termos_versao is not null and (tg_op = 'INSERT' or new.termos_versao is distinct from old.termos_versao) then
    new.termos_aceitos_em := now();
  elsif tg_op = 'UPDATE' then
    new.termos_aceitos_em := old.termos_aceitos_em;
  end if;
  return new;
end $$;
drop trigger if exists dl_lojas_cnpj_guarda on public.dl_lojas;
create trigger dl_lojas_cnpj_guarda before insert or update on public.dl_lojas for each row execute function public.dl_lojas_cnpj_guarda();
