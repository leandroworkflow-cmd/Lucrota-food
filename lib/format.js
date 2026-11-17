export const brl = (n) =>
  (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Aceita "12,50", "1.250,00" ou "12.5"
export function parseValor(texto) {
  const s = String(texto ?? '').trim();
  if (!s) return NaN;
  const limpo = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  return parseFloat(limpo);
}

export function slugify(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

// Telefone brasileiro: só dígitos, com o 55 na frente. '' se não parecer válido.
export function normalizarTelefone(texto) {
  const d = String(texto ?? '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return d;
  return '';
}

export function formatarTelefone(numero) {
  const d = String(numero ?? '').replace(/^55/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

export const linkWhatsApp = (numero, texto) =>
  `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;

export const hora = (iso) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const dataHora = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// Segunda-feira (AAAA-MM-DD) da semana da data, no horário local
export function inicioDaSemana(iso) {
  const d = new Date(iso);
  const dia = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dia);
  const z = d.getTimezoneOffset();
  return new Date(d.getTime() - z * 60000).toISOString().slice(0, 10);
}
