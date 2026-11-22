-- Brokê: duas contas de TESTE prontas (um entregador e um lojista) sem CNH, selfie ou CNPJ. Rode depois do 19.
-- Antes: cada e-mail precisa ter entrado UMA vez no site com o Google (o entregador em /entregador, o lojista em /painel).
-- Depois: troque os dois e-mails abaixo pelos seus e clique em Run. É seguro repetir.
-- Antes de abrir para o público, apague essas contas (veja o fim do arquivo).

alter table public.dl_entregadores add column if not exists conta_teste boolean not null default false;
alter table public.dl_lojas add column if not exists conta_teste boolean not null default false;

-- Conta de teste não precisa da selfie do dia (as demais regras continuam).
create or replace function public.dl_exigir_selfie_dia() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.online and not coalesce(old.online, false) and new.loja_id is null and not coalesce(new.conta_teste, false) then
    if not exists (
      select 1 from public.dl_selfies_dia s
      where s.entregador_id = new.id and s.dia = (now() at time zone 'America/Sao_Paulo')::date
    ) then
      raise exception 'selfie_do_dia';
    end if;
  end if;
  return new;
end $$;

do $$
declare
  email_entregador text := 'TROQUE-PELO-EMAIL-DO-ENTREGADOR@gmail.com';
  email_lojista text := 'TROQUE-PELO-EMAIL-DO-LOJISTA@gmail.com';
  u uuid;
begin
  select id into u from auth.users where lower(email) = lower(email_entregador);
  if u is null then
    raise notice 'Entregador de teste: e-mail % não encontrado. Entre uma vez em /entregador com esse Google e rode de novo.', email_entregador;
  else
    insert into public.dl_entregadores (user_id, nome, telefone, veiculo, aprovado, docs_status, conta_teste)
    values (u, 'Entregador Teste', '5500000000000', 'moto', true, 'aprovado', true)
    on conflict (user_id) do update set aprovado = true, docs_status = 'aprovado', conta_teste = true, loja_id = null;
    raise notice 'Entregador de teste pronto: %', email_entregador;
  end if;

  select id into u from auth.users where lower(email) = lower(email_lojista);
  if u is null then
    raise notice 'Lojista de teste: e-mail % não encontrado. Entre uma vez em /painel com esse Google e rode de novo.', email_lojista;
  else
    insert into public.dl_lojas (dono_id, nome, slug, descricao, categoria, whatsapp, cidade, aberta, ativa, conta_teste)
    values (u, 'Loja Teste', 'loja-teste', 'Conta de teste do Brokê', 'Lanches', '5500000000000', 'Cidade Teste', true, true, true)
    on conflict (dono_id) do update set ativa = true, aberta = true, conta_teste = true;
    raise notice 'Lojista de teste pronto: % (loja em /loja-teste)', email_lojista;
  end if;
end $$;

-- Para apagar as contas de teste antes de lançar:
--   delete from public.dl_entregadores where conta_teste;
--   delete from public.dl_lojas where conta_teste;
