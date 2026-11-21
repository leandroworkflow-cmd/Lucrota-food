-- Brokê: CNPJ (inclui MEI), responsável e aceite do termo de parceria da loja. Rode depois do 15. É seguro repetir.
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
