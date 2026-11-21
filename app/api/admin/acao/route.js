import { avisoDoCliente, avisoParaLoja } from '../../../../lib/avisos-texto';
import { avisarCliente, avisarUsuarios } from '../../../../lib/avisos-servidor';
import { comissaoValida, descricaoAcerto } from '../../../../lib/admin';
import { registrarLancamentos } from '../../../../lib/pagamento-servidor';
import { adminDaRequisicao } from '../../../../lib/admin-servidor';
import { erro, lerJson, uuidValido } from '../../../../lib/entrega-servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Ações do administrador. Cada uma é validada aqui; o navegador só diz o que quer fazer.
export async function POST(request) {
  const r = await adminDaRequisicao(request);
  if (r.resposta) return r.resposta;
  const { admin } = r;
  const b = await lerJson(request);
  if (!b || typeof b !== 'object') return erro('Requisição inválida.', 400);

  switch (b.acao) {
    case 'loja_ativa': {
      if (!uuidValido(b.id) || typeof b.ativa !== 'boolean') return erro('Requisição inválida.', 400);
      const { error } = await admin.from('dl_lojas').update({ ativa: b.ativa }).eq('id', b.id);
      if (error) return erro('Não consegui salvar. Tente de novo.', 502);
      return Response.json({ ok: true });
    }
    case 'loja_comissao': {
      const pct = comissaoValida(b.comissao_pct);
      if (!uuidValido(b.id) || pct === null) return erro('A comissão deve ficar entre 0% e 50%.', 400);
      const { error } = await admin.from('dl_lojas').update({ comissao_pct: pct }).eq('id', b.id);
      if (error) return erro('Não consegui salvar. Tente de novo.', 502);
      return Response.json({ ok: true });
    }
    case 'entregador_aprovado': {
      if (!uuidValido(b.id) || typeof b.aprovado !== 'boolean') return erro('Requisição inválida.', 400);
      if (b.aprovado) {
        const { data: e0 } = await admin.from('dl_entregadores').select('loja_id,docs_status').eq('id', b.id).maybeSingle();
        if (e0 && !e0.loja_id && e0.docs_status !== 'aprovado') return erro('Aprove os documentos do entregador antes de liberá-lo.', 409);
      }
      const { error } = await admin.from('dl_entregadores').update({ aprovado: b.aprovado, ...(b.aprovado ? {} : { online: false }) }).eq('id', b.id);
      if (error) return erro('Não consegui salvar. Tente de novo.', 502);
      return Response.json({ ok: true });
    }
    case 'docs_decisao': {
      if (!uuidValido(b.id) || !['aprovar', 'reprovar'].includes(b.decisao)) return erro('Requisição inválida.', 400);
      const motivo = String(b.motivo || '').trim().slice(0, 200);
      if (b.decisao === 'reprovar' && motivo.length < 3) return erro('Explique o motivo para o entregador corrigir.', 400);
      const { data: e0 } = await admin.from('dl_entregadores').select('user_id,loja_id,docs_status').eq('id', b.id).maybeSingle();
      if (!e0) return erro('Entregador não encontrado.', 404);
      if (e0.docs_status !== 'em_analise') return erro('Esses documentos não estão aguardando análise.', 409);
      const ok = b.decisao === 'aprovar';
      const { error } = await admin
        .from('dl_entregadores')
        .update(ok ? { docs_status: 'aprovado', docs_motivo: null, aprovado: true } : { docs_status: 'reprovado', docs_motivo: motivo, aprovado: false, online: false })
        .eq('id', b.id);
      if (error) return erro('Não consegui salvar. Tente de novo.', 502);
      await avisarUsuarios(admin, [e0.user_id], {
        titulo: ok ? 'Cadastro aprovado!' : 'Documentos recusados',
        corpo: ok ? 'Você já pode ficar online e receber corridas.' : motivo,
        url: '/entregador',
      });
      return Response.json({ ok: true });
    }
    case 'config_entrega': {
      const pct = comissaoValida(b.comissao_entrega_pct);
      if (pct === null) return erro('A parte da plataforma deve ficar entre 0% e 50%.', 400);
      const { error } = await admin.from('dl_config').upsert({ chave: 'comissao_entrega_pct', valor: pct });
      if (error) return erro('Não consegui salvar. Tente de novo.', 502);
      return Response.json({ ok: true });
    }
    case 'liberar_codigo': {
      if (!uuidValido(b.pedido_id)) return erro('Requisição inválida.', 400);
      const { error } = await admin.from('dl_pedidos').update({ tentativas_codigo: 0 }).eq('id', b.pedido_id).eq('status', 'saiu');
      if (error) return erro('Não consegui liberar agora.', 502);
      return Response.json({ ok: true });
    }
    case 'entrega_manual': {
      // Suporte confirmou com o cliente que o pedido chegou: conclui sem o código.
      if (!uuidValido(b.pedido_id)) return erro('Requisição inválida.', 400);
      const agora = new Date().toISOString();
      const { data: p } = await admin
        .from('dl_pedidos')
        .update({ status: 'entregue', entregue_em: agora, atualizado_em: agora })
        .eq('id', b.pedido_id)
        .eq('status', 'saiu')
        .select('id,numero,token,entregador_id,dl_lojas(dono_id,nome)')
        .maybeSingle();
      if (!p) return erro('Esse pedido não está mais aguardando entrega.', 409);
      await registrarLancamentos(admin, p.id);
      if (p.entregador_id) await admin.from('dl_localizacoes').delete().eq('entregador_id', p.entregador_id);
      await avisarCliente(admin, p.id, { ...avisoDoCliente('entregue', { numero: p.numero, lojaNome: p.dl_lojas?.nome }), url: `/pedido/${p.token}`, tag: `pedido-${p.numero}` });
      await avisarUsuarios(admin, [p.dl_lojas?.dono_id].filter(Boolean), { ...avisoParaLoja('entregou', { numero: p.numero }), url: '/painel', tag: `entrega-${p.numero}` });
      return Response.json({ ok: true });
    }
    case 'acertar': {
      const valor = Number(b.valor);
      if (!['loja', 'entregador'].includes(b.tipo) || !uuidValido(b.id) || !Number.isFinite(valor) || valor === 0) return erro('Requisição inválida.', 400);
      const { error } = await admin.rpc('dl_acertar_exato', { p_tipo: b.tipo, p_id: b.id, p_valor: valor, p_descricao: descricaoAcerto(valor) });
      if (error) {
        if (String(error.message).includes('saldo_mudou')) return erro('O saldo mudou desde que você abriu a tela. Atualize a página e confira o valor.', 409);
        console.error('Admin: acerto falhou:', error.message);
        return erro('Não consegui registrar o acerto. Confira se o SQL 09 foi rodado.', 502);
      }
      return Response.json({ ok: true });
    }
    default:
      return erro('Ação desconhecida.', 400);
  }
}
