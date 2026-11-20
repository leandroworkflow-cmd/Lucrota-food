-- Brokê: entregador avisa que chegou na loja. Rode depois do 10. É seguro repetir.
alter table public.dl_pedidos add column if not exists chegou_loja_em timestamptz;   -- quando o entregador tocou em "Cheguei na loja"
alter table public.dl_pedidos add column if not exists entregador_nome text;          -- primeiro nome, para a loja ver quem vem buscar
alter table public.dl_pedidos add column if not exists entregador_veiculo text;
