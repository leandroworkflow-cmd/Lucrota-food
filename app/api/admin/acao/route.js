import { comissaoValida, descricaoAcerto } from '../../../../lib/admin';
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
      const { error } = await admin.from('dl_entregadores').update({ aprovado: b.aprovado, ...(b.aprovado ? {} : { online: false }) }).eq('id', b.id);
      if (error) return erro('Não consegui salvar. Tente de novo.', 502);
      return Response.json({ ok: true });
    }
    case 'config_entrega': {
      const pct = comissaoValida(b.comissao_entrega_pct);
      if (pct === null) return erro('A parte da plataforma deve ficar entre 0% e 50%.', 400);
      const { error } = await admin.from('dl_config').upsert({ chave: 'comissao_entrega_pct', valor: pct });
      if (error) return erro('Não consegui salvar. Tente de novo.', 502);
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
