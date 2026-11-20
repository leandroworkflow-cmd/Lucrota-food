-- Brokê: cancelamento pelo cliente com taxa. Rode depois do 11. É seguro repetir.
alter table public.dl_pedidos add column if not exists preparo_em timestamptz;          -- quando a loja marcou "em preparo" (começa a janela grátis de 3 minutos)
alter table public.dl_pedidos add column if not exists cancelado_por text check (cancelado_por in ('cliente', 'loja'));
alter table public.dl_pedidos add column if not exists taxa_cancelamento numeric not null default 0;

alter table public.dl_pedidos drop constraint if exists dl_pedidos_pagamento_status_check;
alter table public.dl_pedidos add constraint dl_pedidos_pagamento_status_check
  check (pagamento_status in ('pendente', 'pago', 'expirado', 'reembolsado', 'recusado', 'reembolsado_parcial', 'cancelado'));

alter table public.dl_lancamentos drop constraint if exists dl_lancamentos_tipo_check;
alter table public.dl_lancamentos add constraint dl_lancamentos_tipo_check
  check (tipo in ('venda_pix', 'comissao', 'entrega_pix', 'comissao_entrega', 'acerto', 'taxa_cancelamento'));
