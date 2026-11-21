// Regras do pedido de saque. Funções puras.
export const VALOR_MINIMO_SAQUE = 10;
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Saldo livre = saldo na conta menos o que já está pedido e ainda não foi pago.
export const disponivel = (saldo, pendente) => Math.max(0, r2(r2(saldo) - r2(pendente)));

// Converte "12,50" ou 12.5 em número com 2 casas. Devolve null se não for um valor.
export function lerValor(v) {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').trim().replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? r2(n) : null;
}

export function validarSaque({ valor, saldo, pendente, chave }) {
  if (!String(chave || '').trim()) return { erro: 'Cadastre a sua chave Pix antes de sacar.' };
  const v = lerValor(valor);
  if (v === null) return { erro: 'Digite o valor do saque.' };
  if (v < VALOR_MINIMO_SAQUE) return { erro: `O valor mínimo para sacar é R$ ${VALOR_MINIMO_SAQUE},00.` };
  const livre = disponivel(saldo, pendente);
  if (v > livre) {
    const reais = (n) => `R$ ${n.toFixed(2).replace('.', ',')}`;
    if (livre <= 0) return { erro: 'Você não tem saldo livre para sacar.' };
    if (livre < VALOR_MINIMO_SAQUE) return { erro: `Seu saldo livre (${reais(livre)}) ainda está abaixo do mínimo de ${reais(VALOR_MINIMO_SAQUE)} para sacar.` };
    return { erro: `Você pode sacar até ${reais(livre)} agora.` };
  }
  return { valor: v };
}

export const STATUS_SAQUE = { pendente: 'Aguardando pagamento', pago: 'Pago', recusado: 'Recusado', cancelado: 'Cancelado' };
