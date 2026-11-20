-- Brokê: painel do administrador. Rode depois do 08. É seguro repetir.

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
