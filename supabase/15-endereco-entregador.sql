-- Brokê: endereço do entregador no cadastro. Rode depois do 14. É seguro repetir.
alter table public.dl_entregadores add column if not exists endereco text;
