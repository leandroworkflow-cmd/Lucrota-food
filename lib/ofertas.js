// Indicadores do entregador e pendências. Funções puras.

export const SEGUNDOS_OFERTA = 30; // tempo para aceitar uma corrida oferecida
export const MIN_OFERTAS = 5; // abaixo disso a taxa de aceitação ainda não é mostrada
export const MIN_CORRIDAS = 3; // idem para a de finalização

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : null);

// linhas: [{ resposta }] das últimas ofertas do entregador.
// Aceitação = quantas ele pegou entre as que viu. Finalização = concluídas entre as que pegou e terminaram (cancelamento do cliente não conta contra ele).
export function indicadores(linhas) {
  const c = { aceita: 0, recusada: 0, expirada: 0, concluida: 0, desistida: 0 };
  for (const l of linhas || []) if (l.resposta in c) c[l.resposta]++;
  const pegas = c.aceita + c.concluida + c.desistida;
  const total = pegas + c.recusada + c.expirada;
  const fechadas = c.concluida + c.desistida;
  return {
    ofertas: total,
    corridas: fechadas,
    aceitacao: total >= MIN_OFERTAS ? pct(pegas, total) : null,
    finalizacao: fechadas >= MIN_CORRIDAS ? pct(c.concluida, fechadas) : null,
  };
}

// O que falta para o entregador render: cada item tem a tela onde se resolve.
export function pendenciasDoEntregador({ ent, conta }) {
  const p = [];
  if (!ent.exclusivo) {
    if (ent.docs_status === 'sem_documentos') p.push({ id: 'docs', texto: 'Envie seus documentos para começar a receber corridas.', tela: 'documentos', acao: 'Enviar' });
    if (ent.docs_status === 'reprovado') p.push({ id: 'docs', texto: 'Seus documentos foram recusados. Corrija e envie de novo.', tela: 'documentos', acao: 'Corrigir' });
    if (ent.docs_status === 'em_analise') p.push({ id: 'docs', texto: 'Documentos em análise. Avisamos quando houver resposta.', tela: 'documentos', acao: 'Ver' });
  }
  if (!conta.chave_pix) p.push({ id: 'pix', texto: 'Cadastre sua chave Pix para receber os repasses.', tela: 'ganhos', acao: 'Cadastrar' });
  if (conta.saldo < 0) p.push({ id: 'saldo', texto: 'Você tem um valor a pagar à plataforma. Ele é compensado nos próximos repasses.', tela: 'ganhos', acao: 'Ver' });
  return p;
}
