import Marca from '../../components/Marca';
import Rodape from '../../components/Rodape';
import { SITE } from '../../lib/site';

export const metadata = {
  title: 'Termos de uso',
  description: `Regras para clientes e lojas que usam o ${SITE.nome}.`,
  alternates: { canonical: '/termos' },
};

export default function Termos() {
  return (
    <>
      <header className="topo">
        <div className="pagina topo-in">
          <Marca />
        </div>
      </header>
      <main className="pagina texto">
        <h1>Termos de uso</h1>
        <p className="muted">Última atualização: 17 de novembro de 2026</p>

        <h2>O que é o {SITE.nome}</h2>
        <p>
          O {SITE.nome} é uma plataforma que conecta clientes a lojas da região. Quem vende, prepara e responde
          pelo produto é a loja. A plataforma mostra o cardápio, leva o pedido até a loja e ajuda no
          acompanhamento.
        </p>

        <h2>Para clientes</h2>
        <ul>
          <li>Os preços e as taxas são os que a loja cadastrou. O total é mostrado antes de você enviar o pedido.</li>
          <li>O pagamento por Pix ou cartão é feito dentro do app e recebido pela plataforma, que repassa à loja e ao entregador. Também é possível pagar em dinheiro na entrega.</li>
          <li>
            Cancelamento: você pode cancelar pelo app, sem custo, até 3 minutos depois de a loja começar o preparo do pedido.
            Entre 3 e 20 minutos de preparo, nos pedidos pagos pelo app, é cobrada uma taxa de cancelamento de 15% do valor dos produtos,
            somada à taxa de entrega se um entregador já tiver aceitado a corrida. Passados 20 minutos de preparo, o pedido é considerado atrasado e o cancelamento é gratuito. O valor da taxa é mostrado antes de você
            confirmar, e o restante é devolvido ao seu meio de pagamento. A taxa é repassada à loja e ao entregador. Depois que o
            pedido sai para entrega, o cancelamento deve ser combinado com a loja. Se a loja cancelar, você recebe o valor total de volta.
          </li>
          <li>Informe nome, telefone e endereço corretos. Pedidos com dados falsos podem ser recusados.</li>
          <li>Dúvidas sobre o produto, atraso ou problema no pedido devem ser tratadas com a loja pelo WhatsApp.</li>
        </ul>

        <h2>Para lojas</h2>
        <ul>
          <li>Você é responsável pelas informações do cardápio, pela qualidade e segurança dos alimentos e pelas licenças exigidas para a sua atividade.</li>
          <li>
            A plataforma cobra uma comissão sobre o valor dos produtos de cada pedido entregue, no percentual combinado
            com a loja. A taxa de entrega não entra no cálculo. A comissão é cobrada por fatura semanal.
          </li>
          <li>Mantenha o horário de funcionamento atualizado. Feche a loja no painel quando não puder atender.</li>
          <li>É proibido combinar com o cliente a retirada do pedido fora da plataforma para fugir da comissão.</li>
          <li>Podemos suspender lojas que descumprirem estas regras ou receberem reclamações frequentes.</li>
        </ul>

        <h2>Entregadores</h2>
        <p>
          Entregadores atuam como autônomos, escolhendo quando e quais entregas aceitar. Não há vínculo de
          emprego com a plataforma. As condições serão detalhadas quando esse recurso for liberado.
        </p>

        <h2>Responsabilidades</h2>
        <p>
          A plataforma não prepara nem entrega os produtos e não se responsabiliza por falhas da loja, nos limites
          da lei. Faremos o possível para manter o serviço no ar, mas ele pode ficar indisponível por manutenção
          ou por falhas de serviços de terceiros.
        </p>

        <h2>Contato e foro</h2>
        <p>
          Dúvidas: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Estes termos seguem as leis do Brasil.
        </p>
      </main>
      <Rodape />
    </>
  );
}
