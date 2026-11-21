// Textos do cadastro de lojista. Mude a versão ao alterar o termo: quem aceitou uma versão antiga pode ser chamado a aceitar de novo.
export const TERMO_VERSAO = '2026-11-21';

export const REQUISITOS = [
  'CNPJ ativo, inclusive MEI, com atividade (CNAE) de alimentos e bebidas.',
  'Nome completo e CPF do responsável legal, maior de 18 anos, com CPF regular.',
  'Endereço completo da loja e WhatsApp com DDD.',
  'Chave Pix para receber os repasses, de preferência em nome do CNPJ.',
  'Cardápio com fotos, descrições claras e preços definidos.',
  'Cozinha organizada e embalagens que conservem o alimento na entrega.',
];

export const TERMO = [
  {
    t: '1. Quem pode vender',
    p: [
      'Só pode vender no Brokê quem tem CNPJ ativo (empresa ou MEI) com atividade de alimentos e bebidas, e é representado por pessoa maior de 18 anos. Você declara que os dados informados no cadastro são verdadeiros e que tem autorização para representar o CNPJ.',
      'Podemos pedir documentos adicionais, consultar a situação do CNPJ na Receita Federal e recusar, suspender ou desativar a loja que não cumprir os requisitos.',
    ],
  },
  {
    t: '2. Licenças e qualidade',
    p: [
      'A loja é responsável por ter as licenças e alvarás que a lei da sua cidade exigir (por exemplo, alvará de funcionamento e vigilância sanitária), por manipular os alimentos com higiene e por informar ingredientes e alérgenos quando necessário.',
      'Os produtos devem corresponder ao que está no cardápio, com preços, descrição e fotos verdadeiros.',
    ],
  },
  {
    t: '3. Pedidos',
    p: [
      'A loja deve aceitar e preparar os pedidos no prazo informado ao cliente e manter o status do pedido atualizado. Fechar a loja no painel quando não puder atender evita cancelamentos.',
      'A entrega é feita por entregador da própria loja ou por entregador da plataforma. A loja deve entregar o pedido ao entregador quando ele avisar que chegou.',
    ],
  },
  {
    t: '4. Pagamentos, comissão e repasses',
    p: [
      'Pagamentos por Pix e cartão são feitos dentro do app. A loja não recebe pagamento por maquininha própria nesses pedidos. Pagamento em dinheiro na entrega continua disponível.',
      'A plataforma cobra uma comissão sobre o valor dos produtos de cada pedido, informada no painel da loja (hoje, 10%). O percentual pode ser ajustado pela plataforma, com aviso prévio, e vale para os pedidos feitos depois do aviso.',
      'Os valores a receber ficam na conta corrente da loja e são repassados por Pix para a chave cadastrada, em ciclo semanal. Valores devidos à plataforma (por exemplo, comissão de pedidos pagos em dinheiro) são compensados nos repasses.',
    ],
  },
  {
    t: '5. Cancelamentos',
    p: [
      'O cliente pode cancelar sem custo nos primeiros minutos do preparo. Entre os 3 e os 20 minutos, o cancelamento de pedido pago pelo app tem uma taxa de 15% sobre os produtos, que é repassada à loja. Depois de 20 minutos, o cancelamento não tem taxa. Essas regras podem mudar, com aviso na plataforma.',
      'Se a loja cancelar sem motivo justo ou atrasar de forma repetida, a plataforma pode limitar ou suspender a loja.',
    ],
  },
  {
    t: '6. Dados pessoais',
    p: [
      'A loja recebe nome, telefone e endereço do cliente só para entregar o pedido e deve usar esses dados apenas para isso, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018). Os dados do CNPJ e do responsável que você informa são usados para cadastro, verificação e repasses, conforme a Política de Privacidade.',
    ],
  },
  {
    t: '7. Suspensão e encerramento',
    p: [
      'A plataforma pode suspender ou desativar a loja em caso de dados falsos, fraude, descumprimento destes termos ou da lei, ou reclamações graves. A loja pode encerrar a participação a qualquer momento, e os valores pendentes continuam sendo acertados.',
    ],
  },
  {
    t: '8. Aceite',
    p: [
      'Ao marcar a caixa de aceite, a loja declara que leu e concorda com este termo e com os Termos de Uso e a Política de Privacidade do Brokê. O momento do aceite fica registrado.',
    ],
  },
];
