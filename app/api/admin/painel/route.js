import { adminDaRequisicao } from '../../../../lib/admin-servidor';
import { calcularPainel, diaBR } from '../../../../lib/metricas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COLUNAS = 'status,total,comissao_valor,forma_pagamento,loja_id,entregador_id,taxa_cancelamento,criado_em';

// Números do negócio para o administrador (últimos 30 dias e o mês corrente).
export async function GET(request) {
  const r = await adminDaRequisicao(request);
  if (r.resposta) return r.resposta;
  const { admin } = r;
  const agora = Date.now();
  const inicioMes = new Date(`${diaBR(new Date(agora).toISOString()).slice(0, 7)}-01T03:00:00Z`).getTime();
  const desde = new Date(Math.min(agora - 31 * 864e5, inicioMes)).toISOString();

  // O banco entrega no máximo 1000 linhas por consulta: busca em páginas.
  const pedidos = [];
  for (let pg = 0; pg < 20; pg++) {
    const { data, error } = await admin.from('dl_pedidos').select(COLUNAS).gte('criado_em', desde).order('criado_em').range(pg * 1000, pg * 1000 + 999);
    if (error) return Response.json({ error: 'Não consegui carregar os números agora.' }, { status: 502 });
    pedidos.push(...data);
    if (data.length < 1000) break;
  }

  const [lojas, ents] = await Promise.all([
    admin.from('dl_lojas').select('id,nome,ativa,cnpj'),
    admin.from('dl_entregadores').select('id,nome,loja_id,aprovado,online,docs_status'),
  ]);
  if (lojas.error || ents.error) return Response.json({ error: 'Não consegui carregar os números agora.' }, { status: 502 });

  const numeros = calcularPainel(pedidos, agora, {
    lojas: new Map(lojas.data.map((l) => [l.id, l.nome])),
    entregadores: new Map(ents.data.map((e) => [e.id, e.nome])),
  });
  const { data: sq } = await admin.from('dl_saques').select('valor').eq('status', 'pendente');
  const plat = ents.data.filter((e) => !e.loja_id);
  return Response.json(
    {
      ...numeros,
      rede: {
        lojas_ativas: lojas.data.filter((l) => l.ativa).length,
        lojas_total: lojas.data.length,
        lojas_pendentes: lojas.data.filter((l) => !l.ativa).length,
        entregadores_online: ents.data.filter((e) => e.online).length,
        entregadores_total: ents.data.length,
        entregadores_analise: plat.filter((e) => e.docs_status === 'em_analise').length,
        entregadores_sem_docs: plat.filter((e) => e.docs_status === 'sem_documentos' || e.docs_status === 'reprovado').length,
      },
      saques_pendentes: { n: (sq || []).length, total: Math.round((sq || []).reduce((t, x) => t + Number(x.valor), 0) * 100) / 100 },
      atualizado_em: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
