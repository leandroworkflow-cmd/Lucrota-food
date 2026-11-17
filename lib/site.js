// Nome provisório do produto e dados institucionais. Troque aqui quando escolher o nome.
export const SITE = {
  nome: 'Entrega Local',
  slogan: 'Peça das lojas do seu bairro',
  descricao:
    'Peça comida e mercadorias das lojas do seu bairro em Santa Luzia e região. Cardápio direto da loja, entrega rápida e sem taxa escondida.',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://entrega-local.vercel.app').replace(/\/$/, ''),
  cidade: 'Santa Luzia',
  uf: 'MG',
  email: 'lucrota@gmail.com',
};
