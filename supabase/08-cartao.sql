-- MeuDelivery: cartão de crédito e débito pelo app (Mercado Pago). Rode depois do 07. É seguro repetir.
-- A taxa do cartão do Mercado Pago é paga pela plataforma: não aparece em nenhuma conta corrente.

alter table public.dl_pedidos drop constraint if exists dl_pedidos_forma_pagamento_check;
alter table public.dl_pedidos add constraint dl_pedidos_forma_pagamento_check
  check (forma_pagamento in ('pix', 'dinheiro', 'cartao', 'pix_app', 'cartao_app'));

alter table public.dl_pedidos drop constraint if exists dl_pedidos_pagamento_status_check;
alter table public.dl_pedidos add constraint dl_pedidos_pagamento_status_check
  check (pagamento_status in ('pendente', 'pago', 'expirado', 'reembolsado', 'recusado'));
