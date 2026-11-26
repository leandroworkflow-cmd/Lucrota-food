-- Brokê: lojas liberadas pela administração, sem CNPJ nem termo no painel. Rode depois do 28. É seguro repetir.
-- A marca só pode ser mudada aqui no SQL (o lojista não tem permissão de escrita nessa coluna).
alter table public.dl_lojas add column if not exists cadastro_dispensado boolean not null default false;

-- Loja da Viviane: cria (ou ativa) e libera sem cadastro.
do $$
declare
  u uuid;
begin
  select id into u from auth.users where lower(email) = lower('vivianejulio2007@gmail.com');
  if u is null then
    raise exception 'E-mail ainda não entrou no site. Peça para ela abrir /painel e entrar com o Google, depois rode de novo.';
  end if;

  insert into public.dl_lojas (dono_id, nome, slug, descricao, categoria, whatsapp, cidade, aberta, ativa, cadastro_dispensado)
  values (u, 'Vivi', 'vivi', 'Loja cadastrada pelo administrador', 'Lanches', '5531983820232', 'Santa Luzia', true, true, true)
  on conflict (dono_id) do update set ativa = true, aberta = true, cadastro_dispensado = true;

  raise notice 'Loja pronta para vivianejulio2007@gmail.com (aparece em /vivi)';
end $$;
