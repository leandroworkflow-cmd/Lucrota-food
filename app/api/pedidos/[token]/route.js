import { calcularCancelamento } from '../../../../lib/cancelamento';
import { formaOnline } from '../../../../lib/cartao';
import { sincronizarPagamento } from '../../../../lib/pagamento-servidor';
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
      'id,loja_id,numero,status,itens,subtotal,taxa_entrega,total,divida_cliente,chegou_loja_em,forma_pagamento,endereco,criado_em,atualizado_em,entregador_id,entrega,destino_lat,destino_lng,pagamento_status,mp_payment_id,pix_copia_cola,pix_qr_base64,pix_expira_em,preparo_em,cancelado_por,taxa_cancelamento,codigo_entrega,dl_lojas(nome,whatsapp,tempo_estimado,endereco,lat,lng)'
    )
    .eq('token', token)
    .maybeSingle();
  if (error) return Response.json({ error: 'Não consegui consultar agora.' }, { status: 502 });
  if (!data) return Response.json({ error: 'Pedido não encontrado.' }, { status: 404 });

  // Entregador: nome, veículo e, só durante a entrega, a posição (some quando entrega ou cancela).
  let pagamentoStatus = data.pagamento_status;
  if (pagamentoStatus === 'pendente') pagamentoStatus = await sincronizarPagamento(admin, data);
  const pagamento =
    formaOnline(data.forma_pagamento)
      ? {
          status: pagamentoStatus,
          forma: data.forma_pagamento,
          ...(pagamentoStatus === 'pendente' && data.forma_pagamento === 'pix_app' ? { copia_cola: data.pix_copia_cola, qr_base64: data.pix_qr_base64, expira_em: data.pix_expira_em } : {}),
        }
      : null;

  // eslint-disable-next-line no-unused-vars
  const { entregador_id: entregadorId, id, loja_id, pagamento_status, mp_payment_id, pix_copia_cola, pix_qr_base64, pix_expira_em, preparo_em, codigo_entrega, ...resto } = data;
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
  const cancelamento = calcularCancelamento({ ...data, pagamento_status: pagamentoStatus, preparo_em: preparo_em || data.atualizado_em });
  // O código só aparece enquanto a entrega está em andamento.
  const codigoEntrega = ['novo', 'aceito', 'preparo', 'saiu'].includes(data.status) ? codigo_entrega : null;
  return Response.json({ ...resto, entregador, pagamento, cancelamento, codigo_entrega: codigoEntrega }, { headers: { 'Cache-Control': 'no-store' } });
}
