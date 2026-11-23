-- Brokê: frete por distância. Até 3,5 km o cliente paga R$ 5,90 (entregador R$ 5,30 + plataforma R$ 0,60);
-- acima disso, +R$ 1,00 por km para o entregador. É seguro repetir.
-- Pedidos antigos ficam com estas colunas vazias e continuam sendo contados pela regra antiga.

alter table public.dl_pedidos add column if not exists distancia_km numeric check (distancia_km is null or distancia_km >= 0);
alter table public.dl_pedidos add column if not exists frete_entregador numeric check (frete_entregador is null or frete_entregador >= 0);
alter table public.dl_pedidos add column if not exists frete_plataforma numeric check (frete_plataforma is null or frete_plataforma >= 0);

-- Os tipos de lançamento já aceitam 'entrega_pix' e 'comissao_entrega'; nada a mudar na conta corrente.
-- A comissão da loja segue em dl_lojas.comissao_pct (padrão 10%). Para forçar 10% em todas:
-- update public.dl_lojas set comissao_pct = 10;
