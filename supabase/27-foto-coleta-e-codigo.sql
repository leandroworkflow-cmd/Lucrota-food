-- Brokê: foto da coleta do pedido + trava de segurança do código de entrega. Rode depois do 26. É seguro repetir.

alter table public.dl_pedidos add column if not exists foto_coleta text;
alter table public.dl_pedidos add column if not exists foto_coleta_em timestamptz;

-- SEGURANÇA: hoje o dono da loja pode alterar o status do pedido direto do navegador, sem passar pelo
-- servidor, e assim pularia o código de entrega. Todas as mudanças de status já passam pela API
-- (que usa a chave de serviço), então a permissão de escrita direta sai.
revoke update on public.dl_pedidos from anon, authenticated;
drop policy if exists "dono muda status" on public.dl_pedidos;

-- Pedidos em andamento sem código ganham um (o cliente vê o código no acompanhamento do pedido).
update public.dl_pedidos
   set codigo_entrega = lpad((floor(random() * 10000))::int::text, 4, '0'), tentativas_codigo = 0
 where codigo_entrega is null and status in ('novo', 'aceito', 'preparo', 'saiu');
