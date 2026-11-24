-- Brokê: entregador avisa que chegou no endereço do cliente (o cliente recebe aviso com alerta sonoro). Rode depois do 27. É seguro repetir.
alter table public.dl_pedidos add column if not exists chegou_cliente_em timestamptz;
