import { clienteServico } from '../../../../lib/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Só quem tem o link (token impossível de adivinhar) vê o pedido.
export async function GET(_request, { params }) {
  const { token } = await params;
  if (!UUID.test(token)) return Response.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  const admin = clienteServico();
  if (!admin) return Response.json({ error: 'Serviço indisponível.' }, { status: 503 });

  const { data, error } = await admin
    .from('dl_pedidos')
    .select(
      'numero,status,itens,subtotal,taxa_entrega,total,forma_pagamento,endereco,criado_em,atualizado_em,dl_lojas(nome,whatsapp,tempo_estimado)'
    )
    .eq('token', token)
    .maybeSingle();
  if (error) return Response.json({ error: 'Não consegui consultar agora.' }, { status: 502 });
  if (!data) return Response.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
