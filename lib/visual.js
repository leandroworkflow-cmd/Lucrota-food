// Apoio visual (funções puras): emoji do item e categorias da página inicial.

export const semAcento = (t) =>
  String(t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const REGRAS = [
  [/pizza/, '🍕'],
  [/(burger|burguer|hamburguer|x-|lanche|sanduiche)/, '🍔'],
  [/(acai|sorvete|picole|gelato)/, '🍧'],
  [/(batata|porcao|frita|onion|isca|pastel)/, '🍟'],
  [/(milk|shake)/, '🥤'],
  [/(cerveja|chopp|long neck)/, '🍺'],
  [/(refri|suco|agua|bebida|coca|guarana|energetico|limonada)/, '🥤'],
  [/(cafe|capuccino|cappuccino|expresso)/, '☕'],
  [/(bolo|doce|torta|brigadeiro|sobremesa|pudim|brownie|cookie)/, '🍰'],
  [/(marmit|prato|arroz|feijao|feijoada|executivo|almoco)/, '🍛'],
  [/(salada)/, '🥗'],
  [/(pao|padaria|salgado|coxinha)/, '🥐'],
  [/(sushi|japon|temaki)/, '🍣'],
  [/(churrasco|carne|espeto|picanha)/, '🥩'],
  [/(frango)/, '🍗'],
  [/(mercado|mercearia|hortifruti)/, '🛒'],
];

export function emojiDoItem(nome, categoria) {
  const t = `${semAcento(nome)} ${semAcento(categoria)}`;
  for (const [regra, emoji] of REGRAS) if (regra.test(t)) return emoji;
  return '🍽️';
}

export const CATEGORIAS_HOME = [
  { id: 'todas', rotulo: 'Todas', emoji: '🍽️', termos: [] },
  { id: 'lanches', img: '/img/cat-lanches.png', rotulo: 'Lanches', emoji: '🍔', termos: ['lanch', 'hamburg', 'burger', 'sanduiche', 'pastel'] },
  { id: 'pizza', img: '/img/cat-pizza.png', rotulo: 'Pizza', emoji: '🍕', termos: ['pizza'] },
  { id: 'acai', img: '/img/cat-acai.png', rotulo: 'Açaí', emoji: '🍧', termos: ['acai', 'sorvete', 'sobremesa'] },
  { id: 'marmitas', img: '/img/capa-grill.jpg', rotulo: 'Marmitas', emoji: '🍛', termos: ['marmit', 'prato', 'restaurante', 'almoco', 'comida'] },
  { id: 'bebidas', img: '/img/cat-bebidas.png', rotulo: 'Bebidas', emoji: '🥤', termos: ['bebida', 'cerveja', 'adega', 'suco'] },
  { id: 'doces', img: '/img/cat-doces.png', rotulo: 'Doces', emoji: '🍰', termos: ['doce', 'bolo', 'confeitaria', 'padaria'] },
  { id: 'mercado', img: '/img/cat-outros.png', rotulo: 'Mercado', emoji: '🛒', termos: ['mercado', 'mercearia', 'hortifruti'] },
];

export function lojaNaCategoria(loja, categoriaId) {
  const c = CATEGORIAS_HOME.find((x) => x.id === categoriaId);
  if (!c || c.termos.length === 0) return true;
  const t = semAcento(`${loja.categoria || ''} ${loja.nome || ''}`);
  return c.termos.some((termo) => t.includes(termo));
}

export function lojaNaBusca(loja, busca) {
  const q = semAcento(busca).trim();
  if (!q) return true;
  return semAcento(`${loja.nome} ${loja.categoria || ''} ${loja.bairro || ''} ${loja.descricao || ''}`).includes(q);
}

export const inicial = (nome) => (String(nome ?? '').trim().charAt(0) || '?').toUpperCase();

const CORES = ['#5a1a9a', '#0f5a43', '#b3261e', '#2b2f3a', '#b85c00', '#1f5fa8'];

// Cada loja ganha sempre a mesma cor (usada quando ela não tem logo nem capa).
export function corDaLoja(slug) {
  let h = 0;
  for (const c of String(slug)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CORES[h % CORES.length];
}

// Foto de capa padrão (quando a loja ainda não enviou a sua), pelo tipo de loja.
export function fotoDaLoja(loja) {
  const t = semAcento(`${loja.categoria || ''} ${loja.nome || ''}`);
  if (/pizza/.test(t)) return '/img/capa-pizza.jpg';
  if (/(acai|sorvete)/.test(t)) return '/img/capa-acai.jpg';
  if (/(lanch|burger|hamburg|pastel)/.test(t)) return '/img/banner-burger.jpg';
  if (/(doce|bolo|confeit|bebida|adega|mercado|mercearia|hortifruti|padaria)/.test(t)) return null;
  return '/img/capa-grill.jpg';
}
