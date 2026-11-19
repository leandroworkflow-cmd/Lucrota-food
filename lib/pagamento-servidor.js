import { avisarUsuarios } from './avisos-servidor';
import { lancamentosDoPedido } from './partilha';
import { lerPagamento } from './mp-servidor';

const COLUNAS = 'id,numero,token,loja_id,total,status,forma_pagamento,pagamento_status,mp_payment_id,pix_expira_em,taxa_entrega,entregador_id';

// Confere o pagamento direto no Mercado Pago (nunca confia no que chega pelo webhook) e atualiza o pedido.
export async function sincronizarPagamento(admin, pedidoOuId) {
  const { data: p } =
    typeof pedidoOuId === 'string'
      ? await admin.from('dl_pedidos').select(COLUNAS).eq('id', pedidoOuId).maybeSingle()
      : { data: pedidoOuId };
  if (!p || p.forma_pagamento !== 'pix_app' || p.pagamento_status !== 'pendente' || !p.mp_payment_id) return p?.pagamento_status || null;

  const expirou = p.pix_expira_em && new Date(p.pix_expira_em).getTime() < Date.now();
  const pg = await lerPagamento(p.mp_payment_id);

  if (pg && pg.status === 'approved') {
    const valorOk = Math.abs(Number(pg.transaction_amount) - Number(p.total)) < 0.01;
    if (pg.external_reference !== p.id || !valorOk) {
      console.error('Pagamento não confere com o pedido', p.id);
      return p.pagamento_status;
    }
    // "where pagamento_status = pendente" garante que só um dos chamadores (webhook ou consulta) confirma.
    const { data: atualizado } = await admin
      .from('dl_pedidos')
      .update({ pagamento_status: 'pago', pago_em: new Date().toISOString(), atualizado_em: new Date().toISOString() })
      .eq('id', p.id)
      .eq('pagamento_status', 'pendente')
      .select('id')
      .maybeSingle();
    if (atualizado) {
      const { data: loja } = await admin.from('dl_lojas').select('dono_id').eq('id', p.loja_id).maybeSingle();
      const total = Number(p.total).toFixed(2).replace('.', ',');
      await avisarUsuarios(admin, [loja?.dono_id].filter(Boolean), {
        titulo: `Novo pedido ${p.numero} (Pix pago)`,
        corpo: `R$ ${total} já pagos pelo app`,
        url: '/painel',
      });
    }
    return 'pago';
  }

  const morto = pg && ['cancelled', 'rejected', 'expired'].includes(pg.status);
  if (morto || (expirou && !(pg && pg.status === 'approved'))) {
    await admin.from('dl_pedidos').update({ pagamento_status: 'expirado', atualizado_em: new Date().toISOString() }).eq('id', p.id).eq('pagamento_status', 'pendente');
    return 'expirado';
  }
  return 'pendente';
}

// Quando o pedido é entregue, lança na conta corrente de cada um o que ganhou e o que deve à plataforma.
// Pode rodar mais de uma vez: cada lançamento é único por pedido.
export async function registrarLancamentos(admin, pedidoId) {
  try {
    const { data: p } = await admin
      .from('dl_pedidos')
      .select('id,numero,loja_id,forma_pagamento,pagamento_status,subtotal,taxa_entrega,comissao_valor,entregador_id')
      .eq('id', pedidoId)
      .maybeSingle();
    if (!p) return;
    const { data: cfg } = await admin.from('dl_config').select('valor').eq('chave', 'comissao_entrega_pct').maybeSingle();
    const linhas = lancamentosDoPedido(p, { comissaoEntregaPct: Number(cfg?.valor || 0) });
    if (!linhas.length) return;
    await admin
      .from('dl_lancamentos')
      .upsert(linhas.map((l) => ({ ...l, pedido_id: p.id })), { onConflict: 'pedido_id,tipo,conta_tipo', ignoreDuplicates: true });
  } catch (e) {
    console.error('Lançamentos não registrados:', e?.message || e);
  }
}
