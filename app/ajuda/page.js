import BotaoAjuda from '../../components/BotaoAjuda';
import Marca from '../../components/Marca';
import NavInferior from '../../components/NavInferior';
import Rodape from '../../components/Rodape';
import { SITE } from '../../lib/site';

export const metadata = { title: 'Central de ajuda', description: `Fale com o ${SITE.nome} pelo WhatsApp.` };

const DUVIDAS = [
  ['Como cancelo um pedido?', 'Abra o pedido em Meus pedidos e toque em Cancelar pedido. É grátis até 3 minutos depois de a loja começar o preparo. Entre 3 e 20 minutos há uma taxa de 15% dos produtos para a loja, e, se o entregador já esperou mais de 10 minutos na loja, R$ 3,00 para ele. Depois de 20 minutos o cancelamento volta a ser grátis. Em Pix ou cartão a taxa é descontada do valor pago; em dinheiro ela fica como saldo devedor no seu próximo pedido pelo app.'],
  ['O que é o código de entrega?', 'Cada pedido tem um código de 4 números, que aparece na tela do pedido. Informe-o ao entregador só quando receber o pedido: é com ele que a entrega é concluída.'],
  ['Paguei e o pedido não apareceu.', 'Pix e cartão pelo app são confirmados na hora. Se passou de alguns minutos, fale com a gente informando o número do pedido.'],
  ['Quando o lojista e o entregador recebem?', 'Os repasses são feitos toda semana por Pix, na chave cadastrada. O saldo aparece em Conta, no painel da loja e no app do entregador.'],
];

export default function Ajuda() {
  return (
    <>
      <header className="topo-app">
        <div className="pagina">
          <div className="topo-linha">
            <Marca />
          </div>
          <h1 className="titulo-topo">Central de ajuda</h1>
        </div>
      </header>
      <main className="pagina home-corpo" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <section className="bloco">
          <h2 style={{ fontSize: 22 }}>Fale com a gente no WhatsApp</h2>
          <p className="muted" style={{ margin: 0 }}>
            Escolha quem você é. A mensagem já vai pronta; se tiver o número do pedido, escreva junto. Dentro do pedido, o botão de ajuda já leva o número.
          </p>
          <div className="opcoes">
            <BotaoAjuda papel="cliente" rotulo="Sou cliente" />
            <BotaoAjuda papel="lojista" rotulo="Sou lojista" />
            <BotaoAjuda papel="entregador" rotulo="Sou entregador" />
          </div>
        </section>
        <section className="bloco">
          <h2 style={{ fontSize: 22 }}>Dúvidas comuns</h2>
          {DUVIDAS.map(([p, r]) => (
            <details key={p}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{p}</summary>
              <p className="muted" style={{ margin: '8px 0 0' }}>{r}</p>
            </details>
          ))}
        </section>
      </main>
      <Rodape />
      <NavInferior ativo="conta" />
    </>
  );
}
