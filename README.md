# Entrega Local (nome provisório)

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

- Pagamento só na entrega (Pix, dinheiro ou cartão), direto com a loja. A plataforma não segura dinheiro.
- A entrega é feita pela própria loja. Entregadores da plataforma são a fase 2.
- Uma loja por conta Google.
- O limite de pedidos por IP é simples (em memória do servidor). Para mais proteção, use um serviço próprio.
- Revise os Termos e a Política de Privacidade com um advogado antes de abrir ao público.

## Fotos e loja de exemplo

1. No Supabase (SQL Editor), rode `supabase/02-imagens.sql`: cria as colunas de foto e a pasta pública `dl-imagens`.
2. Troque `SEU_EMAIL_DO_GOOGLE@gmail.com` em `supabase/03-loja-exemplo.sql` pelo seu e-mail e rode: cria a "Lanchonete Exemplo" já liberada.
3. No painel (Minha loja e Cardápio) o lojista envia logo, capa e foto de cada item. A foto é reduzida no celular antes do envio.
