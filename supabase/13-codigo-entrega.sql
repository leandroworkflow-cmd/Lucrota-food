-- Brokê: código de entrega. Rode depois do 12. É seguro repetir.
alter table public.dl_pedidos add column if not exists codigo_entrega text check (codigo_entrega ~ '^[0-9]{4}$');
alter table public.dl_pedidos add column if not exists tentativas_codigo int not null default 0;

-- Pedidos que já estão em andamento também ganham um código.
update public.dl_pedidos
   set codigo_entrega = lpad((floor(random() * 10000))::int::text, 4, '0')
 where codigo_entrega is null and status in ('novo', 'aceito', 'preparo', 'saiu');
