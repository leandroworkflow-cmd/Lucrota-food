// Frete por distância (funções puras, sem imports). O servidor SEMPRE recalcula; a tela só mostra.
//
// Regra:
//  - Até 3,5 km: o cliente paga R$ 5,90 fixos (entregador R$ 5,30 + plataforma R$ 0,60).
//  - Acima de 3,5 km: o entregador recebe R$ 5,30 + R$ 1,00 por km que passar de 3,5.
//    O cliente paga o valor do entregador + R$ 0,60 da plataforma.

export const FRETE = {
  ATE_KM: 3.5, // até esta distância o valor é fixo
  ENTREGADOR_BASE: 5.3, // o que o entregador recebe dentro da faixa fixa
  KM_EXTRA: 1.0, // R$ por km acima de ATE_KM (pago ao entregador)
  PLATAFORMA: 0.6, // fica com a plataforma em toda entrega
};

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// km: distância loja → cliente em quilômetros. Sem distância válida, cobra a faixa fixa.
// Devolve { km, entregador, plataforma, cliente } já arredondados em centavos.
export function calcularFrete(km) {
  const d = km === null || km === undefined || km === '' ? NaN : Number(km);
  const valida = Number.isFinite(d) && d >= 0;
  const extra = valida && d > FRETE.ATE_KM ? (d - FRETE.ATE_KM) * FRETE.KM_EXTRA : 0;
  const entregador = r2(FRETE.ENTREGADOR_BASE + extra);
  const plataforma = r2(FRETE.PLATAFORMA);
  return {
    km: valida ? Math.round(d * 100) / 100 : null,
    entregador,
    plataforma,
    cliente: r2(entregador + plataforma),
  };
}

// Menor valor que o cliente pode pagar (mostrado antes de saber o endereço).
export const FRETE_MINIMO = calcularFrete(0).cliente; // 5,90
