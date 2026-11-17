import { clienteServico } from './servidor';

const CORES = ['#1b3a9e', '#0f5a43', '#7a1f3d', '#2b2f3a', '#8a4b00', '#4a2c8a'];

// Cada loja ganha sempre a mesma cor de toldo, calculada pelo endereço (slug) dela.
export function corDaLoja(slug) {
  let h = 0;
  for (const c of String(slug)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CORES[h % CORES.length];
}

// Só colunas seguras para o público (nada de comissão nem dono).
const PUBLICAS =
  'id,nome,slug,descricao,categoria,whatsapp,endereco,bairro,cidade,taxa_entrega,pedido_minimo,tempo_estimado,aberta';

export async function lojasAtivas() {
  const admin = clienteServico();
  if (!admin) return [];
  const { data } = await admin
    .from('dl_lojas')
    .select(PUBLICAS)
    .eq('ativa', true)
    .order('aberta', { ascending: false })
    .order('nome');
  return data || [];
}

export async function lojaComCardapio(slug) {
  const admin = clienteServico();
  if (!admin) return null;
  const { data: loja } = await admin
    .from('dl_lojas')
    .select(PUBLICAS)
    .eq('slug', slug)
    .eq('ativa', true)
    .maybeSingle();
  if (!loja) return null;
  const { data: produtos } = await admin
    .from('dl_produtos')
    .select('id,categoria,nome,descricao,preco,ordem')
    .eq('loja_id', loja.id)
    .eq('ativo', true)
    .order('ordem')
    .order('nome');
  return { loja, produtos: produtos || [] };
}
