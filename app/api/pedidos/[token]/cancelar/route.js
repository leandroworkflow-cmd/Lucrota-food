import { avisoCancelamentoEntregador, avisoParaLoja } from '../../../../../lib/avisos-texto';
import { avisarUsuarios } from '../../../../../lib/avisos-servidor';
import { calcularCancelamento } from '../../../../../lib/cancelamento';
import { formaOnline } from '../../../../../lib/cartao';
import { mesmoValor } from '../../../../../lib/admin';
import { cancelarPagamento, reembolsar } from '../../../../../lib/mp-servidor';
import { clienteServico } from '../../../../../lib/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const erro = (error, status, extra) => Response.json({ error, ...extra }, { status });

// O cliente cancela o próprio pedido. A credencial é o token do pedido. O servidor refaz a conta da taxa:
// se ela mudou desde que o cliente viu (passou dos 3 minutos), pede nova confirmação.
export async function POST(request, { params }) {
  const { token } = await params;
  if (!UUID.test(token)) return erro('Pedido não encontrado.', 404);
  const admin = clienteServico();
  if (!admin) return erro('Serviço indisponível.', 503);
  let body = null;
  try {
    body = await request.json();
  } catch {
    /* sem corpo */
  }

  const { data: p } = await admin
    .from('dl_pedidos')
    .select('id,numero,status,forma_pagamento,pagamento_status,mp_payment_id,subtotal,taxa_entrega,total,divida_cliente,cliente_telefone,entregador_id,preparo_em,chegou_loja_em,atualizado_em,loja_id,dl_lojas(dono_id,nome)')
    .eq('token', token)
    .maybeSingle();
  if (!p) return erro('Pedido não encontrado.', 404);

  const c = calcularCancelamento({ ...p, preparo_em: p.preparo_em || p.atualizado_em });
  if (!c.pode) return erro(c.motivo, 409, { cancelamento: c });
  if (!mesmoValor(Number(body?.taxa_vista ?? -1), c.taxa)) {
    return erro('O valor da taxa de cancelamento mudou. Confira e confirme de novo.', 409, { cancelamento: c });
  }

  // 1) Garante o cancelamento (só se o pedido continua na mesma etapa que o cliente viu).
  const agora = new Date().toISOString();
  const { data: preso } = await admin
    .from('dl_pedidos')
    .update({ status: 'cancelado', cancelado_por: 'cliente', taxa_cancelamento: c.taxa, atualizado_em: agora })
    .eq('id', p.id)
    .eq('status', p.status)
    .select('id')
    .maybeSingle();
  if (!preso) return erro('O pedido acabou de mudar de etapa. Atualize a tela e tente de novo.', 409);

  // 2) Pix/cartão: devolve o que foi pago, menos a taxa (a taxa sai do valor pago).
  let novoPagamento = null;
  if (formaOnline(p.forma_pagamento) && p.mp_payment_id) {
    let deuCerto = true;
    if (p.pagamento_status === 'pago') {
      deuCerto = await reembolsar(p.mp_payment_id, c.taxa > 0 ? c.reembolso : undefined);
      novoPagamento = c.taxa > 0 ? 'reembolsado_parcial' : 'reembolsado';
    } else if (p.pagamento_status === 'pendente') {
      deuCerto = await cancelarPagamento(p.mp_payment_id);
      novoPagamento = 'cancelado';
    }
    if (!deuCerto) {
      // Não conseguiu devolver: desfaz o cancelamento para o pedido não ficar cancelado com o dinheiro retido.
      await admin
        .from('dl_pedidos')
        .update({ status: p.status, cancelado_por: null, taxa_cancelamento: 0, atualizado_em: new Date().toISOString() })
        .eq('id', p.id)
        .eq('status', 'cancelado')
        .eq('cancelado_por', 'cliente');
      return erro('Não consegui devolver o pagamento agora. O pedido não foi cancelado. Tente de novo em instantes.', 502);
    }
    if (novoPagamento) await admin.from('dl_pedidos').update({ pagamento_status: novoPagamento }).eq('id', p.id);
  }

  // 3) Pix/cartão: a taxa já está com a plataforma, então entra na hora na conta de cada um (produtos para a loja, R$ 3,00 para o entregador).
  //    Dinheiro: nada foi pago ainda. O cliente fica com saldo devedor e a loja e o entregador só recebem quando ele quitar.
  if (c.taxa > 0) {
    if (c.devedor) {
      const { error: eDiv } = await admin.from('dl_dividas_cliente').upsert(
        {
          telefone: p.cliente_telefone,
          pedido_id: p.id,
          valor: c.taxa,
          descricao: `Taxa de cancelamento do pedido ${p.numero}`,
          loja_id: c.taxa_loja > 0 ? p.loja_id : null,
          valor_loja: c.taxa_loja,
          entregador_id: c.taxa_entregador > 0 && p.entregador_id ? p.entregador_id : null,
          valor_entregador: c.taxa_entregador > 0 && p.entregador_id ? c.taxa_entregador : 0,
        },
        { onConflict: 'pedido_id', ignoreDuplicates: true }
      );
      if (eDiv) console.error('Saldo devedor não registrado:', p.numero, eDiv.message);
    } else {
      const linhas = [];
      if (c.taxa_loja > 0) linhas.push({ conta_tipo: 'loja', loja_id: p.loja_id, pedido_id: p.id, tipo: 'taxa_cancelamento', valor: c.taxa_loja, descricao: `Taxa de cancelamento do pedido ${p.numero}` });
      if (c.taxa_entregador > 0 && p.entregador_id) linhas.push({ conta_tipo: 'entregador', entregador_id: p.entregador_id, pedido_id: p.id, tipo: 'taxa_cancelamento', valor: c.taxa_entregador, descricao: `Taxa de cancelamento do pedido ${p.numero}` });
      const { error } = await admin.from('dl_lancamentos').upsert(linhas, { onConflict: 'pedido_id,tipo,conta_tipo', ignoreDuplicates: true });
      if (error) console.error('Taxa de cancelamento não lançada:', p.numero, error.message);
    }
  }

  // 4) Avisos.
  await avisarUsuarios(admin, [p.dl_lojas?.dono_id].filter(Boolean), {
    ...avisoParaLoja('cancelou_cliente', { numero: p.numero, taxa: c.taxa_loja }),
    url: '/painel',
    tag: `cancelado-${p.numero}`,
  });
  if (p.entregador_id) {
    const { data: e } = await admin.from('dl_entregadores').select('user_id').eq('id', p.entregador_id).maybeSingle();
    if (e?.user_id) await avisarUsuarios(admin, [e.user_id], { ...avisoCancelamentoEntregador({ numero: p.numero, taxa: c.taxa_entregador }), url: '/entregador', tag: `cancelado-${p.numero}` });
  }
  return Response.json({ ok: true, taxa: c.taxa, reembolso: c.reembolso });
}
