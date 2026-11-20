// Regras do painel do administrador (funções puras).

export const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// ADMIN_EMAILS="voce@gmail.com, socio@gmail.com"
export const listaAdmins = (env) =>
  new Set(String(env || '').split(/[,;\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean));

// Só vale o e-mail confirmado pelo login (Google confirma). Nada que o navegador mande.
export function ehAdmin(user, env) {
  const email = String(user?.email || '').toLowerCase();
  const confirmado = Boolean(user?.email_confirmed_at || user?.confirmed_at);
  return Boolean(email && confirmado && listaAdmins(env).has(email));
}

export function comissaoValida(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 50) return null;
  return r2(n);
}

// contas: [{ conta: 'loja'|'entregador', id, nome, chave_pix, saldo }]
// A pagar: saldo positivo (a plataforma repassa). A cobrar: saldo negativo (a pessoa deve).
// Valores abaixo do mínimo ficam acumulando para a próxima semana.
export function planoRepasse(contas, { minimo = 1 } = {}) {
  const lista = (contas || []).map((c) => ({ ...c, saldo: r2(c.saldo) }));
  const pagar = lista.filter((c) => c.saldo >= minimo).sort((a, b) => b.saldo - a.saldo);
  const cobrar = lista.filter((c) => c.saldo <= -minimo).sort((a, b) => a.saldo - b.saldo);
  const acumulando = lista.filter((c) => c.saldo !== 0 && Math.abs(c.saldo) < minimo);
  return {
    pagar,
    cobrar,
    acumulando,
    totalPagar: r2(pagar.reduce((s, c) => s + c.saldo, 0)),
    totalCobrar: r2(cobrar.reduce((s, c) => s - c.saldo, 0)),
  };
}

const celula = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const decimal = (n) => r2(n).toFixed(2).replace('.', ',');

// Planilha para abrir no Excel/Google Planilhas (separador ";", decimal com vírgula).
export function csvRepasses(pagar) {
  const linhas = [['Tipo', 'Nome', 'Chave Pix', 'Valor']];
  for (const c of pagar) linhas.push([c.conta === 'loja' ? 'Loja' : 'Entregador', c.nome, c.chave_pix || '', decimal(c.saldo)]);
  return `﻿${linhas.map((l) => l.map(celula).join(';')).join('\r\n')}`;
}

export const mesmoValor = (a, b) => Math.round(Number(a) * 100) === Math.round(Number(b) * 100);

export function descricaoAcerto(saldo, data = new Date()) {
  const d = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
  return saldo > 0 ? `Repasse pago por Pix em ${d}` : `Valor recebido por Pix em ${d}`;
}
