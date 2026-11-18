-- Loja de EXEMPLO para a página inicial não ficar vazia (e para você testar o pedido).
-- 1) A loja fica na conta que entrou por último no painel (entre no /painel com o seu Google antes de rodar).
-- 2) Rode no SQL Editor. Cada conta tem uma loja só: para cadastrar a sua loja de verdade,
--    primeiro apague a de exemplo com o comando que está no fim deste arquivo.

with dono as (
  select id from auth.users order by last_sign_in_at desc nulls last limit 1
), loja as (
  insert into public.dl_lojas
    (dono_id, nome, slug, descricao, categoria, whatsapp, endereco, bairro, cidade,
     taxa_entrega, pedido_minimo, tempo_estimado, aberta, ativa, comissao_pct)
  select id, 'Lanchonete Exemplo', 'lanchonete-exemplo',
         'Loja de exemplo para testar o pedido. Hambúrguer artesanal, porções e bebidas geladas.',
         'Lanches', '5531999990000', 'Rua Exemplo, 100', 'Centro', 'Santa Luzia',
         6, 20, '30-45 min', true, true, 10
  from dono
  on conflict (slug) do update set aberta = true, ativa = true
  returning id
)
insert into public.dl_produtos (loja_id, categoria, nome, descricao, preco, ordem)
select loja.id, p.categoria, p.nome, p.descricao, p.preco, p.ordem
from loja, (values
  ('Lanches', 'X-Burger',            'Pão, hambúrguer 150 g, queijo, alface e tomate', 25.50, 1),
  ('Lanches', 'X-Bacon',             'Hambúrguer, bacon crocante, queijo e maionese da casa', 29.90, 2),
  ('Lanches', 'X-Salada Duplo',      'Dois hambúrgueres, queijo, alface, tomate e cebola', 34.00, 3),
  ('Porções', 'Batata frita',        'Porção de 400 g, crocante e sequinha', 22.00, 1),
  ('Porções', 'Onion rings',         'Anéis de cebola empanados, 300 g', 24.00, 2),
  ('Bebidas', 'Refrigerante lata',   '350 ml, bem gelado', 7.00, 1),
  ('Bebidas', 'Suco natural',        'Laranja ou maracujá, 400 ml', 9.00, 2),
  ('Sobremesas', 'Milkshake',        'Chocolate, morango ou ovomaltine, 400 ml', 16.00, 1)
) as p(categoria, nome, descricao, preco, ordem)
where not exists (select 1 from public.dl_produtos x where x.loja_id = loja.id);

-- Para APAGAR a loja de exemplo depois:
-- delete from public.dl_lojas where slug = 'lanchonete-exemplo';
