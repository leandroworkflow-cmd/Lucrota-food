// Código de entrega: 4 números que o cliente informa ao entregador no fim da entrega. Sem ele a entrega não conclui.
export const MAX_TENTATIVAS_CODIGO = 5;

export const gerarCodigo = (n) => String(Math.abs(Math.trunc(Number(n)) || 0) % 10000).padStart(4, '0');
export const soCodigo = (v) => String(v ?? '').replace(/\D/g, '');

// Devolve { ok } ou { erro, errado?, bloqueado? }. Pedido sem código (antigo) passa.
export function conferirCodigo({ esperado, tentativas = 0, informado }) {
  if (!esperado) return { ok: true, semCodigo: true };
  if (Number(tentativas) >= MAX_TENTATIVAS_CODIGO) {
    return { erro: 'Código bloqueado por excesso de tentativas. Fale com a central de ajuda.', bloqueado: true };
  }
  const i = soCodigo(informado);
  if (i.length !== 4) return { erro: 'Digite os 4 números do código de entrega.' };
  if (i === String(esperado)) return { ok: true };
  const restam = MAX_TENTATIVAS_CODIGO - Number(tentativas) - 1;
  return restam > 0
    ? { erro: `Código incorreto. Restam ${restam} ${restam === 1 ? 'tentativa' : 'tentativas'}.`, errado: true }
    : { erro: 'Código incorreto. Entrega bloqueada: fale com a central de ajuda.', errado: true, bloqueado: true };
}
