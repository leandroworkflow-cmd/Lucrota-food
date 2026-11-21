// Nome do produto e dados institucionais.
export const SITE = {
  nome: 'Brokê',
  slogan: 'Peça. Receba. Aproveite.',
  descricao:
    'Peça comida e mercadorias das lojas do seu bairro em Santa Luzia e região. Cardápio direto da loja, entrega rápida e sem taxa escondida.',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://lucrotafood.vercel.app').replace(/\/$/, ''),
  cidade: 'Santa Luzia',
  uf: 'MG',
  email: 'lucrota@gmail.com',
  // WhatsApp da central de ajuda (DDI 55 + DDD + número). Pode ser trocado no Vercel sem mexer no código.
  suporteWhatsapp: (process.env.NEXT_PUBLIC_SUPORTE_WHATSAPP || '5531983733004').replace(/\D/g, ''),
};
