-- Brokê: chamar o entregador sozinho quando a loja inicia o preparo (a loja pode desligar). Rode depois do 21. É seguro repetir.
alter table public.dl_lojas add column if not exists chamar_automatico boolean not null default true;
grant insert (chamar_automatico) on public.dl_lojas to authenticated;
grant update (chamar_automatico) on public.dl_lojas to authenticated;
