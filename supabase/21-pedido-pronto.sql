-- Brokê: botão "Pedido pronto" na loja (o entregador e o painel passam a ver que já pode retirar). Rode depois do 20. É seguro repetir.
alter table public.dl_pedidos add column if not exists pronto_em timestamptz;
