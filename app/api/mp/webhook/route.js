import { sincronizarPagamento } from '../../../../lib/pagamento-servidor';
import { clienteServico } from '../../../../lib/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// O Mercado Pago avisa que um pagamento mudou. O corpo NÃO é confiável: só usamos o número do pagamento
// para achar o pedido e conferimos o estado real direto na API do Mercado Pago.
export async function POST(request) {
  const url = new URL(request.url);
  let corpo = {};
  try {
    corpo = await request.json();
  } catch {
    /* alguns avisos vêm só pela URL */
  }
  const tipo = corpo?.type || url.searchParams.get('type') || url.searchParams.get('topic');
  const id = String(corpo?.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id') || '');
  if (tipo !== 'payment' || !/^\d{3,20}$/.test(id)) return Response.json({ ok: true });

  const admin = clienteServico();
  if (!admin) return Response.json({ ok: true });
  const { data: pedido } = await admin
    .from('dl_pedidos')
    .select('id,numero,token,loja_id,total,status,forma_pagamento,pagamento_status,mp_payment_id,pix_expira_em,taxa_entrega,divida_cliente,entregador_id')
    .eq('mp_payment_id', id)
    .maybeSingle();
  if (pedido) await sincronizarPagamento(admin, pedido);
  return Response.json({ ok: true });
}

// O Mercado Pago pode testar o endereço com GET.
export async function GET() {
  return Response.json({ ok: true });
}
