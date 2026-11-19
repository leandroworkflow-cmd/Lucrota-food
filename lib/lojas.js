import { clienteServico } from './servidor';

export { corDaLoja } from './visual';

// Só colunas seguras para o público (nada de comissão nem dono).
const PUBLICAS =
  'id,nome,slug,descricao,categoria,whatsapp,endereco,bairro,cidade,taxa_entrega,pedido_minimo,tempo_estimado,aberta,logo_url,capa_url,aceita_pix_app';

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
    .select('id,categoria,nome,descricao,preco,ordem,imagem_url')
    .eq('loja_id', loja.id)
    .eq('ativo', true)
    .order('ordem')
    .order('nome');
  return { loja, produtos: produtos || [] };
}
