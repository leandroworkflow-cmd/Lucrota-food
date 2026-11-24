import { entregadorPodeVer, MAX_ENTREGAS_ATIVAS } from '../../../../lib/entrega';
import { indicadores, pendenciasDoEntregador } from '../../../../lib/ofertas';
import { entregadorDaRequisicao, erro } from '../../../../lib/entrega-servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LOJA = 'nome,endereco,bairro,cidade,whatsapp,lat,lng,aceita_plataforma';

// Tudo que a tela do entregador precisa: perfil, entregas em andamento e corridas disponíveis.
export async function GET(request) {
  const c = await entregadorDaRequisicao(request);
  if (c.resposta) return c.resposta;
  const { admin, ent } = c;

  const { data: ativas, error: e1 } = await admin
    .from('dl_pedidos')
    .select(
      `id,numero,status,loja_id,chegou_loja_em,pronto_em,foto_coleta_em,cliente_nome,cliente_telefone,endereco,bairro,complemento,observacao,forma_pagamento,troco_para,total,taxa_entrega,frete_entregador,destino_lat,destino_lng,dl_lojas(${LOJA})`
    )
    .eq('entregador_id', ent.id)
    .in('status', ['aceito', 'preparo', 'saiu'])
    .order('criado_em');
  if (e1) return erro('Não consegui consultar agora.', 502);

  let disponiveis = [];
  if (ent.online && (ativas || []).length < MAX_ENTREGAS_ATIVAS) {
    let q = admin
      .from('dl_pedidos')
      .select(`id,numero,status,loja_id,bairro,taxa_entrega,frete_entregador,forma_pagamento,total,entrega,entregador_id,dl_lojas(${LOJA})`)
      .eq('entrega', 'procurando')
      .is('entregador_id', null)
      .in('status', ['aceito', 'preparo'])
      .order('criado_em')
      .limit(30);
    const { data, error: e2 } = await q;
    if (e2) return erro('Não consegui consultar agora.', 502);
    const { data: recus } = await admin.from('dl_ofertas').select('pedido_id').eq('entregador_id', ent.id).eq('resposta', 'recusada');
    const recusadas = new Set((recus || []).map((r) => r.pedido_id));
    disponiveis = (data || [])
      .filter((p) => !recusadas.has(p.id) && entregadorPodeVer(ent, p, p.dl_lojas))
      .map(({ entrega, entregador_id, ...p }) => p);
  }

  // Conta corrente: saldo e últimos lançamentos (positivo: a plataforma repassa; negativo: o entregador deve).
  const { data: lanc } = await admin
    .from('dl_lancamentos')
    .select('id,tipo,valor,descricao,criado_em')
    .eq('entregador_id', ent.id)
    .order('criado_em', { ascending: false })
    .limit(5000);
  const conta = {
    saldo: Math.round((lanc || []).reduce((t, l) => t + Number(l.valor), 0) * 100) / 100,
    extrato: (lanc || []).slice(0, 8),
    chave_pix: ent.chave_pix || '',
  };

  const { data: ofs } = await admin.from('dl_ofertas').select('resposta').eq('entregador_id', ent.id).order('atualizado_em', { ascending: false }).limit(100);
  const ind = indicadores(ofs || []);
  const pendencias = pendenciasDoEntregador({ ent: { exclusivo: false, docs_status: ent.docs_status }, conta });

  let lojaNome = null;
  if (ent.loja_id) {
    const { data } = await admin.from('dl_lojas').select('nome').eq('id', ent.loja_id).maybeSingle();
    lojaNome = data?.nome || null;
  }
  return Response.json(
    {
      entregador: {
        id: ent.id,
        nome: ent.nome,
        veiculo: ent.veiculo,
        online: ent.online,
        exclusivo: false,
        loja_nome: lojaNome,
        aprovado: ent.aprovado,
        docs_status: ent.docs_status,
      },
      conta,
      indicadores: ind,
      pendencias,
      ativas: ativas || [],
      disponiveis,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
