import { avisoDoCliente, avisoParaLoja } from '../../../../lib/avisos-texto';
import { avisarCliente, avisarUsuarios } from '../../../../lib/avisos-servidor';
import { avisarCorridaDisponivel } from '../../../../lib/corrida-servidor';
import { chegadaValida, passoDaEntrega } from '../../../../lib/entrega';
import { registrarLancamentos } from '../../../../lib/pagamento-servidor';
import { entregadorDaRequisicao, erro, lerJson, uuidValido } from '../../../../lib/entrega-servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// acao: 'cheguei' | 'coletei' | 'entreguei' | 'desistir'
export async function POST(request) {
  const c = await entregadorDaRequisicao(request);
  if (c.resposta) return c.resposta;
  const { admin, ent } = c;
  const body = await lerJson(request);
  if (!uuidValido(body?.pedido_id)) return erro('Pedido inválido.', 400);

  const { data: pedido } = await admin
    .from('dl_pedidos')
    .select('id,numero,token,status,entregador_id,entrega,chegou_loja_em,dl_lojas(dono_id,nome,lat,lng)')
    .eq('id', body.pedido_id)
    .maybeSingle();
  if (!pedido) return erro('Pedido não encontrado.', 404);

  const passo = passoDaEntrega(ent, pedido, body.acao);
  if (passo.erro) return erro(passo.erro, 409);

  if (body.acao === 'cheguei') {
    const gps = chegadaValida({ lat: Number(body.lat), lng: Number(body.lng) }, pedido.dl_lojas);
    if (gps.erro) return erro(gps.erro, 409);
  }

  const { error } = await admin.from('dl_pedidos').update(passo.dados).eq('id', pedido.id).eq('entregador_id', ent.id);
  if (error) return erro('Não consegui atualizar agora. Tente de novo.', 502);
  // Terminou ou desistiu: apaga a posição guardada, para não expor a localização à toa.
  if (body.acao === 'entreguei' || body.acao === 'desistir') {
    const { count } = await admin
      .from('dl_pedidos')
      .select('id', { count: 'exact', head: true })
      .eq('entregador_id', ent.id)
      .eq('status', 'saiu');
    if (!count) await admin.from('dl_localizacoes').delete().eq('entregador_id', ent.id);
  }

  if (body.acao === 'entreguei') await registrarLancamentos(admin, pedido.id);

  const primeiroNome = ent.nome.split(' ')[0];
  if (body.acao === 'cheguei') {
    // Alerta urgente para a loja (fica na tela até alguém ver) e aviso para o cliente.
    await avisarUsuarios(admin, [pedido.dl_lojas?.dono_id].filter(Boolean), {
      ...avisoParaLoja('chegou', { numero: pedido.numero, entregadorNome: primeiroNome }),
      url: '/painel',
      tag: `chegada-${pedido.numero}`,
      urgente: true,
    });
    const aviso = avisoDoCliente('chegou_loja', { numero: pedido.numero, entregadorNome: primeiroNome });
    await avisarCliente(admin, pedido.id, { ...aviso, url: `/pedido/${pedido.token}`, tag: `pedido-${pedido.numero}` });
  }
  if (body.acao === 'desistir') {
    await avisarUsuarios(admin, [pedido.dl_lojas?.dono_id].filter(Boolean), {
      ...avisoParaLoja('desistiu', { numero: pedido.numero }),
      url: '/painel',
      tag: `entrega-${pedido.numero}`,
    });
    // A corrida volta para a fila: avisa de novo os entregadores disponíveis (menos quem acabou de desistir).
    await avisarCorridaDisponivel(admin, pedido.id, { reaberta: true, exceto: ent.id });
  }
  if (body.acao === 'coletei' || body.acao === 'entreguei') {
    const status = body.acao === 'coletei' ? 'saiu' : 'entregue';
    const aviso = avisoDoCliente(status, { numero: pedido.numero, lojaNome: pedido.dl_lojas?.nome, entregadorNome: primeiroNome });
    await avisarCliente(admin, pedido.id, { ...aviso, url: `/pedido/${pedido.token}`, tag: `pedido-${pedido.numero}` });
    await avisarUsuarios(admin, [pedido.dl_lojas?.dono_id].filter(Boolean), {
      ...avisoParaLoja(body.acao === 'coletei' ? 'coletou' : 'entregou', { numero: pedido.numero, entregadorNome: primeiroNome }),
      url: '/painel',
      tag: `entrega-${pedido.numero}`,
    });
  }
  return Response.json({ ok: true });
}
