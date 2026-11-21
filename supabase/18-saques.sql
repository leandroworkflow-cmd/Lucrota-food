-- Brokê: pedido de saque por Pix (loja e entregador). Rode depois do 17. É seguro repetir.
create table if not exists public.dl_saques (
  id uuid primary key default gen_random_uuid(),
  conta_tipo text not null check (conta_tipo in ('loja', 'entregador')),
  loja_id uuid references public.dl_lojas (id) on delete cascade,
  entregador_id uuid references public.dl_entregadores (id) on delete cascade,
  valor numeric not null check (valor > 0),
  chave_pix text not null,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'recusado', 'cancelado')),
  motivo text,
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  check (
    (conta_tipo = 'loja' and loja_id is not null and entregador_id is null)
    or (conta_tipo = 'entregador' and entregador_id is not null and loja_id is null)
  )
);
create index if not exists dl_saques_status_idx on public.dl_saques (status, criado_em desc);
create index if not exists dl_saques_loja_idx on public.dl_saques (loja_id, criado_em desc);
create index if not exists dl_saques_ent_idx on public.dl_saques (entregador_id, criado_em desc);
alter table public.dl_saques enable row level security;
revoke all on public.dl_saques from anon, authenticated;

-- Cria o pedido só se o valor couber no saldo livre (saldo menos pedidos pendentes). Trava a conta para dois pedidos simultâneos não passarem do saldo.
create or replace function public.dl_pedir_saque(p_tipo text, p_id uuid, p_valor numeric, p_chave text, p_minimo numeric default 10)
returns uuid language plpgsql as $$
declare v_saldo numeric; v_pend numeric; v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_id::text));
  if p_tipo = 'loja' then
    select coalesce(sum(valor), 0) into v_saldo from public.dl_lancamentos where loja_id = p_id;
    select coalesce(sum(valor), 0) into v_pend from public.dl_saques where loja_id = p_id and status = 'pendente';
  elsif p_tipo = 'entregador' then
    select coalesce(sum(valor), 0) into v_saldo from public.dl_lancamentos where entregador_id = p_id;
    select coalesce(sum(valor), 0) into v_pend from public.dl_saques where entregador_id = p_id and status = 'pendente';
  else
    raise exception 'conta_invalida';
  end if;
  if p_valor < p_minimo then raise exception 'abaixo_do_minimo'; end if;
  if round(p_valor, 2) > round(v_saldo - v_pend, 2) then raise exception 'saldo_insuficiente'; end if;
  insert into public.dl_saques (conta_tipo, loja_id, entregador_id, valor, chave_pix)
  values (p_tipo, case when p_tipo = 'loja' then p_id end, case when p_tipo = 'entregador' then p_id end, round(p_valor, 2), p_chave)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.dl_pedir_saque(text, uuid, numeric, text, numeric) from public, anon, authenticated;

-- Marca como pago: baixa o valor da conta corrente e fecha o pedido, tudo de uma vez.
create or replace function public.dl_pagar_saque(p_saque uuid)
returns numeric language plpgsql as $$
declare s public.dl_saques%rowtype; v_saldo numeric; v_conta uuid;
begin
  select * into s from public.dl_saques where id = p_saque for update;
  if not found then raise exception 'nao_encontrado'; end if;
  if s.status <> 'pendente' then raise exception 'ja_resolvido'; end if;
  v_conta := coalesce(s.loja_id, s.entregador_id);
  perform pg_advisory_xact_lock(hashtext(v_conta::text));
  if s.conta_tipo = 'loja' then
    select coalesce(sum(valor), 0) into v_saldo from public.dl_lancamentos where loja_id = s.loja_id;
    if round(v_saldo, 2) < round(s.valor, 2) then raise exception 'saldo_insuficiente'; end if;
    insert into public.dl_lancamentos (conta_tipo, loja_id, tipo, valor, descricao) values ('loja', s.loja_id, 'acerto', -s.valor, 'Saque pago por Pix');
  else
    select coalesce(sum(valor), 0) into v_saldo from public.dl_lancamentos where entregador_id = s.entregador_id;
    if round(v_saldo, 2) < round(s.valor, 2) then raise exception 'saldo_insuficiente'; end if;
    insert into public.dl_lancamentos (conta_tipo, entregador_id, tipo, valor, descricao) values ('entregador', s.entregador_id, 'acerto', -s.valor, 'Saque pago por Pix');
  end if;
  update public.dl_saques set status = 'pago', resolvido_em = now() where id = s.id;
  return s.valor;
end $$;
revoke all on function public.dl_pagar_saque(uuid) from public, anon, authenticated;
