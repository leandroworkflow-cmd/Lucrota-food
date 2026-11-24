import { adminDaRequisicao } from '../../../../lib/admin-servidor';
import { uuidValido } from '../../../../lib/entrega-servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Fotos dos documentos de UM entregador, em links que expiram em 5 minutos.
export async function GET(request) {
  const r = await adminDaRequisicao(request);
  if (r.resposta) return r.resposta;
  const { admin } = r;
  const id = new URL(request.url).searchParams.get('id');
  if (!uuidValido(id)) return Response.json({ error: 'Requisição inválida.' }, { status: 400 });

  const { data: docs } = await admin.from('dl_documentos').select('tipo,caminho').eq('entregador_id', id);
  const links = {};
  const pdfs = {};
  for (const d of docs || []) {
    const { data } = await admin.storage.from('dl-documentos').createSignedUrl(d.caminho, 300);
    if (data?.signedUrl) links[d.tipo] = data.signedUrl;
    if (d.caminho.endsWith('.pdf')) pdfs[d.tipo] = true;
  }
  const { data: dias } = await admin.from('dl_selfies_dia').select('dia,caminho,criado_em').eq('entregador_id', id).order('dia', { ascending: false }).limit(7);
  const selfiesDia = [];
  for (const d of dias || []) {
    const { data } = await admin.storage.from('dl-documentos').createSignedUrl(d.caminho, 300);
    if (data?.signedUrl) selfiesDia.push({ dia: d.dia, criado_em: d.criado_em, url: data.signedUrl });
  }
  const { data: ent } = await admin
    .from('dl_entregadores')
    .select('nome,cpf,veiculo,telefone,endereco,docs_status,docs_motivo,cnh_nome,cnh_validade,cnh_categoria,placa,docs_enviados_em,docs_analise')
    .eq('id', id)
    .maybeSingle();
  return Response.json({ links, pdfs, selfiesDia, entregador: ent }, { headers: { 'Cache-Control': 'no-store' } });
}
