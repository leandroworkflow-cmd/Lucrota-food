import { avisoDoCliente, transicaoDaLoja } from '../../../../lib/avisos-texto';
import { avisarCliente } from '../../../../lib/avisos-servidor';
import { erro, lerJson, uuidValido } from '../../../../lib/entrega-servidor';
import { cancelarPagamento, reembolsar } from '../../../../lib/mp-servidor';
import { registrarLancamentos } from '../../../../lib/pagamento-servidor';
import { clienteServico, usuarioDaRequisicao } from '../../../../lib/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A loja muda o status de um pedido dela; o servidor valida e avisa o cliente.
export async function POST(request) {
  const r = await usuarioDaRequisicao(request);
  if (r.resposta) return r.resposta;
  const admin = clienteServico();
  if (!admin) return erro('Serviço ainda não configurado no servidor.', 503);
  const body = await lerJson(request);
  if (!uuidValido(body?.pedido_id) || typeof body?.status !== 'string') return erro('Pedido inválido.', 400);

  const { data: pedido } = await admin
    .from('dl_pedidos')
    .select('id,numero,status,entregador_id,loja_id,forma_pagamento,pagamento_status,mp_payment_id,dl_lojas(dono_id,nome)')
    .eq('id', body.pedido_id)
    .maybeSingle();
  if (!pedido || pedido.dl_lojas?.dono_id !== r.user.id) return erro('Pedido não encontrado.', 404);

  const t = transicaoDaLoja(pedido.status, body.status, Boolean(pedido.entregador_id));
  if (t.erro) return erro(t.erro, 409);

  if (pedido.pagamento_status === 'pendente' && body.status !== 'cancelado') return erro('Aguarde o cliente pagar o Pix.', 409);

  // Cancelou um pedido pago pelo app: a plataforma devolve o Pix ao cliente.
  let novoPagamento = null;
  if (body.status === 'cancelado' && pedido.forma_pagamento === 'pix_app' && pedido.mp_payment_id) {
    if (pedido.pagamento_status === 'pago') {
      if (!(await reembolsar(pedido.mp_payment_id))) {
        return erro('Não consegui devolver o Pix automaticamente. Fale com a plataforma para devolver o valor ao cliente.', 502);
      }
      novoPagamento = 'reembolsado';
    } else if (pedido.pagamento_status === 'pendente') {
      await cancelarPagamento(pedido.mp_payment_id);
      novoPagamento = 'expirado';
    }
  }

  const agora = new Date().toISOString();
  const { error } = await admin
    .from('dl_pedidos')
    .update({ status: body.status, atualizado_em: agora, ...(novoPagamento ? { pagamento_status: novoPagamento } : {}) })
    .eq('id', pedido.id)
    .eq('status', pedido.status);
  if (error) return erro('Não consegui mudar o status. Tente de novo.', 502);

  if (body.status === 'entregue') await registrarLancamentos(admin, pedido.id);

  const aviso = avisoDoCliente(body.status, { numero: pedido.numero, lojaNome: pedido.dl_lojas?.nome });
  if (aviso) {
    const { data: p } = await admin.from('dl_pedidos').select('token').eq('id', pedido.id).maybeSingle();
    await avisarCliente(admin, pedido.id, { ...aviso, url: `/pedido/${p?.token}`, tag: `pedido-${pedido.numero}` });
  }
  return Response.json({ ok: true });
}
