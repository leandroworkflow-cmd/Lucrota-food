import { adminDaRequisicao } from '../../../../lib/admin-servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const r = await adminDaRequisicao(request);
  if (r.resposta) return r.resposta;
  const { admin } = r;

  const [lojas, ents, saldos, cfg, acertos] = await Promise.all([
    admin.from('dl_lojas').select('id,nome,slug,ativa,aberta,comissao_pct,chave_pix,cidade,whatsapp,criado_em').order('criado_em', { ascending: false }),
    admin.from('dl_entregadores').select('id,nome,telefone,veiculo,loja_id,aprovado,chave_pix,docs_status,docs_analise,criado_em').order('criado_em', { ascending: false }),
    admin.from('dl_saldos').select('conta,id,saldo'),
    admin.from('dl_config').select('chave,valor'),
    admin.from('dl_lancamentos').select('id,conta_tipo,loja_id,entregador_id,valor,descricao,criado_em').eq('tipo', 'acerto').order('criado_em', { ascending: false }).limit(80),
  ]);
  const travadas = await admin
    .from('dl_pedidos')
    .select('id,numero,cliente_nome,cliente_telefone,tentativas_codigo,dl_lojas(nome),dl_entregadores(nome)')
    .eq('status', 'saiu')
    .gte('tentativas_codigo', 5)
    .limit(50);
  const falha = [lojas, ents, saldos, cfg, acertos, travadas].find((x) => x.error);
  if (falha) {
    console.error('Admin: consulta falhou:', falha.error.message);
    return Response.json({ error: 'Não consegui carregar os dados. Confira se os SQL 07, 08 e 09 foram rodados.' }, { status: 502 });
  }

  const saldo = new Map((saldos.data || []).map((s) => [`${s.conta}:${s.id}`, Number(s.saldo)]));
  const nomeLoja = new Map(lojas.data.map((l) => [l.id, l.nome]));
  const nomeEnt = new Map(ents.data.map((e) => [e.id, e.nome]));
  return Response.json(
    {
      travadas: (travadas.data || []).map((t) => ({ id: t.id, numero: t.numero, cliente: t.cliente_nome, telefone: t.cliente_telefone, loja: t.dl_lojas?.nome, entregador: t.dl_entregadores?.nome })),
      lojas: lojas.data.map((l) => ({ ...l, saldo: saldo.get(`loja:${l.id}`) || 0 })),
      entregadores: ents.data.map((e) => ({ ...e, saldo: saldo.get(`entregador:${e.id}`) || 0 })),
      config: Object.fromEntries((cfg.data || []).map((c) => [c.chave, Number(c.valor)])),
      acertos: acertos.data.map((a) => ({
        id: a.id,
        conta: a.conta_tipo,
        nome: (a.conta_tipo === 'loja' ? nomeLoja.get(a.loja_id) : nomeEnt.get(a.entregador_id)) || '(removido)',
        valor: Number(a.valor),
        descricao: a.descricao,
        criado_em: a.criado_em,
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
