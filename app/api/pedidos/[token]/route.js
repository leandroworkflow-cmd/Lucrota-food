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
      'numero,status,itens,subtotal,taxa_entrega,total,forma_pagamento,endereco,criado_em,atualizado_em,entregador_id,entrega,destino_lat,destino_lng,dl_lojas(nome,whatsapp,tempo_estimado,endereco,lat,lng)'
    )
    .eq('token', token)
    .maybeSingle();
  if (error) return Response.json({ error: 'Não consegui consultar agora.' }, { status: 502 });
  if (!data) return Response.json({ error: 'Pedido não encontrado.' }, { status: 404 });

  // Entregador: nome, veículo e, só durante a entrega, a posição (some quando entrega ou cancela).
  const { entregador_id: entregadorId, ...resto } = data;
  let entregador = null;
  if (entregadorId && ['aceito', 'preparo', 'saiu'].includes(data.status)) {
    const { data: e } = await admin.from('dl_entregadores').select('nome,veiculo').eq('id', entregadorId).maybeSingle();
    if (e) {
      entregador = { nome: String(e.nome).split(' ')[0], veiculo: e.veiculo };
      if (data.status === 'saiu') {
        const { data: pos } = await admin.from('dl_localizacoes').select('lat,lng,atualizado_em').eq('entregador_id', entregadorId).maybeSingle();
        if (pos) Object.assign(entregador, pos);
      }
    }
  }
  return Response.json({ ...resto, entregador }, { headers: { 'Cache-Control': 'no-store' } });
}
