# Brokê

Delivery de bairro: o cliente pede pelo celular, a loja recebe com aviso e a plataforma cobra uma
comissão sobre o valor dos produtos dos pedidos entregues. Este é o **protótipo da fase 1**
(sem entregadores da plataforma e sem pagamento online).

Para trocar o nome, edite `lib/site.js` e `components/Marca.js`.

## O que já funciona

- **Cliente (sem cadastro):** lista de lojas, cardápio, sacola, envio do pedido e acompanhamento por link.
- **Loja:** login Google, cadastro da loja, cardápio, pedidos em colunas (novos, em andamento, finalizados),
  abrir/fechar a loja, som e aviso de pedido novo no celular, e extrato semanal de comissão.
- **Segurança:** preços e totais são sempre recalculados no servidor; a loja não consegue se liberar nem mudar a
  própria comissão (permissões por coluna no banco); pedidos só são criados pelo servidor.

## Como colocar no ar

1. **GitHub:** crie um repositório novo (ex.: `entrega-local`) e suba esta pasta.
2. **Supabase:** pode usar o mesmo projeto do Lucrota. Rode `supabase/entrega-local.sql` no SQL Editor.
   Em **Authentication > URL Configuration**, adicione o endereço do novo site em *Redirect URLs*
   (ex.: `https://SEU-SITE.vercel.app/**`). O login Google já configurado continua valendo.
3. **Vercel:** importe o repositório e cadastre as variáveis de `.env.example`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `NEXT_PUBLIC_SITE_URL` e, para os avisos, as três chaves VAPID).
   Gere as chaves VAPID com `npx web-push generate-vapid-keys`.
4. **Localmente:** `npm install` e `npm run dev` (copie `.env.example` para `.env.local`).

## Liberar uma loja e definir a comissão

Toda loja nova entra "em análise" e só aparece para os clientes depois que você liberar, no SQL Editor:

```sql
update public.dl_lojas set ativa = true, comissao_pct = 10 where slug = 'nome-da-loja';
```

## Cobrança da comissão

A tela **Comissão** do lojista soma, por semana, os pedidos marcados como *entregue*. A cobrança é manual na
fase 1: você envia a fatura por WhatsApp com a sua chave Pix. A comissão incide só sobre os produtos (a taxa de
entrega não entra).

## Limites conhecidos (por ser a fase 1)

- Pix e cartão só pelo app (a plataforma recebe). Na entrega só dinheiro. As opções "Pix/cartão na entrega" foram removidas do checkout.
- A entrega é feita pela própria loja. Entregadores da plataforma são a fase 2.
- Uma loja por conta Google.
- O limite de pedidos por IP é simples (em memória do servidor). Para mais proteção, use um serviço próprio.
- Revise os Termos e a Política de Privacidade com um advogado antes de abrir ao público.

## Pix pelo app e conta corrente

**Modelo:** o Pix pelo app cai inteiro na conta Mercado Pago da plataforma, que repassa depois. Cada pedido entregue gera lançamentos na conta corrente de cada um:

| Forma de pagamento | Loja | Entregador |
|---|---|---|
| Pix pelo app | + produtos, − comissão | + taxa de entrega, − parte da plataforma |
| Dinheiro na entrega | − comissão (deve à plataforma) | − parte da plataforma (deve à plataforma) |

O saldo é a soma. Positivo: a plataforma repassa por Pix. Negativo: a pessoa deve à plataforma. Pix do app e dinheiro se compensam na mesma conta. "Parte da plataforma" na entrega é `comissao_entrega_pct` (começa em 0).

Configuração:
1. Rode `supabase/06-pix.sql` e depois `supabase/07-conta-corrente.sql` no Supabase, **antes de publicar**.
2. No Vercel: `MP_ACCESS_TOKEN` (credencial de produção da sua aplicação no Mercado Pago, API de Payments) e `NEXT_PUBLIC_SITE_URL`. Redeploy.
3. Sem `MP_ACCESS_TOKEN`, a opção "Pix pelo app" some do checkout.
4. Acerto de contas, no SQL Editor:
   - `select * from public.dl_saldos order by saldo;` mostra quem recebe (saldo positivo) e quem deve (negativo), com a chave Pix.
   - Depois de fazer o Pix, zere a conta: `select public.dl_acertar('loja', 'ID-DA-LOJA');` (ou `'entregador'`).
   - Parte da plataforma na entrega: `update public.dl_config set valor = 10 where chave = 'comissao_entrega_pct';`
5. Desligar o Pix do app em uma loja: `update public.dl_lojas set aceita_pix_app = false where slug = 'nome-da-loja';`

Cuidados: o valor pago por Pix fica na sua conta até o repasse. Cancelamentos de pedido pago devolvem o Pix ao cliente automaticamente. O pagamento só é aceito depois de conferido direto no Mercado Pago (valor e pedido).

## Avisos no celular

1. Rode `supabase/05-avisos.sql` no Supabase.
2. Gere as chaves com `npx web-push generate-vapid-keys` e coloque no Vercel: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` (`mailto:seu-email`). Faça um Redeploy.
3. Quem recebe: a loja (pedido novo, entregador aceitou, saiu, entregue), o entregador (corrida nova) e o cliente (aceito, preparo, saiu, entregue, cancelado). Cada um ativa pelo botão "Ativar avisos" na própria tela.
4. No iPhone os avisos só funcionam com o site instalado na Tela de Início.

## GPS e entregadores (gratuito)

Mapa: OpenStreetMap + Leaflet. Rota e tempo: OSRM público. Endereço para coordenadas: Nominatim. Nenhum serviço pago e nenhuma chave extra.

1. **Antes de publicar esta versão**, rode `supabase/04-entregas.sql` no Supabase (ou o `00-tudo-de-uma-vez.sql`, em um projeto novo).
2. Em *Minha loja*, a loja marca o ponto no mapa e copia o código dos seus entregadores.
3. Entregador: entra em `/entregador` com o Google. Com o código da loja entra liberado só para ela. Sem código, entra na plataforma e você libera pelo SQL:
   `update public.dl_entregadores set aprovado = true where telefone = '5531999990000';`
4. Fluxo: loja aceita o pedido, clica em *Chamar entregador*, o entregador aceita, pega o pedido (o GPS dele passa a aparecer para o cliente) e confirma a entrega.

Limites dos serviços gratuitos: o mapa e o OSRM públicos servem para começar (uso leve). Com muito volume, troque por um provedor próprio (MapTiler, Stadia, OSRM hospedado).

## Fotos e loja de exemplo

1. No Supabase (SQL Editor), rode `supabase/02-imagens.sql`: cria as colunas de foto e a pasta pública `dl-imagens`.
2. Troque `SEU_EMAIL_DO_GOOGLE@gmail.com` em `supabase/03-loja-exemplo.sql` pelo seu e-mail e rode: cria a "Lanchonete Exemplo" já liberada.
3. No painel (Minha loja e Cardápio) o lojista envia logo, capa e foto de cada item. A foto é reduzida no celular antes do envio.

## Cartão pelo app (crédito e débito, à vista)
1. Rode `supabase/08-cartao.sql` (depois do 07).
2. No Vercel, adicione `NEXT_PUBLIC_MP_PUBLIC_KEY` (a **Public Key** de produção, em Credenciais da sua aplicação no Mercado Pago). Redeploy.
3. Sem essa chave, a opção "Cartão pelo app" some; o Pix continua funcionando.
- O número do cartão vai direto do navegador ao Mercado Pago (vira um token); nosso servidor nunca o vê.
- A taxa do cartão é da plataforma: loja e entregador recebem na conta corrente igual ao Pix.
- Recusado: o pedido não é criado e o cliente vê o motivo. Em análise: o pedido espera a confirmação. Cancelar pedido pago devolve o valor na fatura.

## Painel do administrador (/admin)
1. Rode `supabase/09-admin.sql` (depois do 08).
2. No Vercel, crie `ADMIN_EMAILS` com o(s) e-mail(s) do Google de quem administra (separe por vírgula). Redeploy.
3. Entre em `/admin` com essa conta. Só ela acessa; a checagem é no servidor.
- **Repasses:** lista quem receber (com chave Pix para copiar e planilha CSV) e quem deve. Faça o Pix no banco e clique em "Marcar como pago". O servidor confere se o saldo ainda é o mesmo que você viu.
- **Lojas:** aprovar/desativar e definir a comissão de cada uma.
- **Entregadores:** aprovar/bloquear os da plataforma.
- **Histórico:** todos os acertos feitos. Também dá para ajustar a parte da plataforma na taxa de entrega.
