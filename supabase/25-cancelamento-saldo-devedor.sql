-- Brokê: taxa de cancelamento. Entregador: R$ 3,00 depois de 10 min esperando na loja. Loja: 15% dos produtos entre 3 e 20 min de preparo.
-- Pedido em DINHEIRO que cancela com taxa: o cliente fica com saldo devedor (por telefone), cobrado no próximo pedido pelo app.
-- É seguro repetir.

create table if not exists public.dl_dividas_cliente (
  id uuid primary key default gen_random_uuid(),
  telefone text not null,
  pedido_id uuid references public.dl_pedidos (id) on delete set null,
  valor numeric not null check (valor > 0),
  descricao text,
  criada_em timestamptz not null default now(),
  quitada_em timestamptz,
  pedido_quitacao_id uuid references public.dl_pedidos (id) on delete set null,
  -- Quanto da dívida é de cada um. Só entra na conta corrente deles quando o cliente quitar.
  loja_id uuid references public.dl_lojas (id) on delete set null,
  valor_loja numeric not null default 0,
  entregador_id uuid references public.dl_entregadores (id) on delete set null,
  valor_entregador numeric not null default 0
);
alter table public.dl_dividas_cliente add column if not exists loja_id uuid references public.dl_lojas (id) on delete set null;
alter table public.dl_dividas_cliente add column if not exists valor_loja numeric not null default 0;
alter table public.dl_dividas_cliente add column if not exists entregador_id uuid references public.dl_entregadores (id) on delete set null;
alter table public.dl_dividas_cliente add column if not exists valor_entregador numeric not null default 0;
create unique index if not exists dl_dividas_cliente_pedido on public.dl_dividas_cliente (pedido_id);
create index if not exists dl_dividas_cliente_aberta on public.dl_dividas_cliente (telefone) where quitada_em is null;
alter table public.dl_dividas_cliente enable row level security;
revoke all on public.dl_dividas_cliente from anon, authenticated;   -- só o servidor lê e grava

-- Saldo devedor antigo somado a este pedido (pago por Pix/cartão junto com ele).
alter table public.dl_pedidos add column if not exists divida_cliente numeric not null default 0 check (divida_cliente >= 0);
