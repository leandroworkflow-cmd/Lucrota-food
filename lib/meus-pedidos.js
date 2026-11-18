'use client';

// Sem conta: o aparelho lembra dos últimos pedidos pelo endereço secreto (token) de cada um.
const CHAVE = 'md:pedidos';

export function lerPedidos() {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function guardarPedido(p) {
  try {
    const lista = [p, ...lerPedidos().filter((x) => x.token !== p.token)].slice(0, 15);
    localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    /* sem armazenamento: o link do pedido continua funcionando */
  }
}
