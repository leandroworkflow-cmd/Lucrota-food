import { erro, entregadorDaRequisicao, lerJson } from '../../../../../lib/entrega-servidor';
import { avisarUsuarios } from '../../../../../lib/avisos-servidor';
import { docsFaltando, validarDadosDocs, avaliarRegras, precisaDeDocumentos, ROTULO_DOC } from '../../../../../lib/documentos';
import { conferirComIA } from '../../../../../lib/ia-documentos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Fecha o envio: confere os dados digitados, as regras e (se ligada) a IA, e coloca o cadastro em análise.
export async function POST(request) {
  const c = await entregadorDaRequisicao(request);
  if (c.resposta) return c.resposta;
  const { admin, ent } = c;
  if (!precisaDeDocumentos(ent)) return erro('Entregadores de loja não precisam enviar documentos.', 400);
  if (ent.docs_status === 'aprovado') return erro('Seus documentos já foram aprovados.', 409);
  if (ent.docs_status === 'em_analise') return erro('Seus documentos já estão em análise.', 409);

  const v = validarDadosDocs(await lerJson(request), ent.veiculo);
  if (v.erro) return erro(v.erro, 400);

  const { data: docs } = await admin.from('dl_documentos').select('tipo,caminho').eq('entregador_id', ent.id);
  const falta = docsFaltando(ent.veiculo, (docs || []).map((d) => d.tipo));
  if (falta.length) return erro(`Falta enviar: ${falta.map((t) => ROTULO_DOC[t]).join(', ')}.`, 400);

  // Conferência automática (a selfie nunca vai para a IA).
  const arquivos = {};
  const ia = process.env.IA_PROVEDOR && process.env.IA_PROVEDOR !== 'nenhum';
  if (ia) {
    for (const d of docs || []) {
      if (d.tipo === 'selfie') continue;
      const { data } = await admin.storage.from('dl-documentos').download(d.caminho);
      if (data) arquivos[d.tipo] = new Uint8Array(await data.arrayBuffer());
    }
  }
  const auto = await conferirComIA(arquivos, v.dados, ent.nome);
  const alertas = [...avaliarRegras(ent, v.dados), ...auto.alertas];

  const { error: e } = await admin
    .from('dl_entregadores')
    .update({
      ...v.dados,
      docs_status: 'em_analise',
      docs_motivo: null,
      docs_enviados_em: new Date().toISOString(),
      docs_consentimento_em: new Date().toISOString(),
      docs_analise: { alertas, ia_usada: auto.usada, leitura: auto.leitura },
    })
    .eq('id', ent.id);
  if (e) return erro('Não consegui concluir o envio. Tente de novo.', 502);
  return Response.json({ ok: true });
}
