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
