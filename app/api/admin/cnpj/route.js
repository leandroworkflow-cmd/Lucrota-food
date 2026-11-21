import { adminDaRequisicao } from '../../../../lib/admin-servidor';
import { uuidValido } from '../../../../lib/entrega-servidor';
import { cnpjValido } from '../../../../lib/cnpj';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Consulta pública e gratuita da situação do CNPJ (BrasilAPI, dados da Receita Federal). Só para o admin.
export async function GET(request) {
  const r = await adminDaRequisicao(request);
  if (r.resposta) return r.resposta;
  const id = new URL(request.url).searchParams.get('id');
  if (!uuidValido(id)) return Response.json({ error: 'Requisição inválida.' }, { status: 400 });
  const { data: loja } = await r.admin.from('dl_lojas').select('cnpj,razao_social').eq('id', id).maybeSingle();
  if (!loja?.cnpj || !cnpjValido(loja.cnpj)) return Response.json({ error: 'Essa loja não informou um CNPJ válido.' }, { status: 400 });
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${loja.cnpj}`, { signal: AbortSignal.timeout(10000), cache: 'no-store' });
    if (res.status === 404) return Response.json({ error: 'CNPJ não encontrado na Receita.' }, { status: 404 });
    if (!res.ok) throw new Error(String(res.status));
    const j = await res.json();
    return Response.json({
      razao_social: j.razao_social,
      nome_fantasia: j.nome_fantasia || null,
      situacao: j.descricao_situacao_cadastral,
      cnae: `${j.cnae_fiscal} ${j.cnae_fiscal_descricao}`,
      cnae_alimentos: String(j.cnae_fiscal || '').startsWith('56') || String(j.cnae_fiscal || '').startsWith('47') || (j.cnaes_secundarios || []).some((c) => String(c.codigo).startsWith('56')),
      municipio: `${j.municipio}/${j.uf}`,
      informada: loja.razao_social,
    });
  } catch {
    return Response.json({ error: 'Não consegui consultar a Receita agora. Tente de novo em alguns minutos.' }, { status: 502 });
  }
}
