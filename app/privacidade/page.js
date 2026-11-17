import Marca from '../../components/Marca';
import Rodape from '../../components/Rodape';
import { SITE } from '../../lib/site';

export const metadata = {
  title: 'Política de privacidade',
  description: `Como o ${SITE.nome} trata os dados de clientes e lojas (LGPD).`,
  alternates: { canonical: '/privacidade' },
};

export default function Privacidade() {
  return (
    <>
      <header className="topo">
        <div className="pagina topo-in">
          <Marca />
        </div>
      </header>
      <main className="pagina texto">
        <h1>Política de privacidade</h1>
        <p className="muted">Última atualização: 17 de novembro de 2026</p>
        <p>
          Esta política explica como o {SITE.nome} trata dados pessoais, conforme a Lei Geral de Proteção de
          Dados (Lei nº 13.709/2018).
        </p>

        <h2>Quais dados tratamos</h2>
        <ul>
          <li>
            <strong>Clientes:</strong> nome, telefone e endereço de entrega informados no pedido, além do conteúdo do
            pedido. Não é preciso criar conta.
          </li>
          <li>
            <strong>Lojas:</strong> nome e e-mail da conta Google usada no login, dados da loja, cardápio e pedidos
            recebidos.
          </li>
          <li>
            <strong>Avisos no celular (opcional):</strong> dados técnicos de entrega das notificações, se a loja ativá-las.
          </li>
        </ul>

        <h2>Para que usamos</h2>
        <p>
          Para levar o pedido até a loja, permitir a entrega e o contato sobre o pedido, acompanhar o status, calcular a
          comissão das lojas e manter a segurança do serviço. Base legal: execução de contrato e legítimo interesse.
        </p>

        <h2>Com quem compartilhamos</h2>
        <p>
          O cliente tem nome, telefone, endereço e pedido compartilhados com a loja escolhida, que precisa deles para
          entregar. Usamos também Supabase (banco de dados e login), Google (login das lojas) e Vercel (hospedagem).
          Não vendemos dados pessoais.
        </p>

        <h2>Armazenamento no navegador</h2>
        <p>
          Guardamos no seu aparelho a sacola e, para agilizar o próximo pedido, os dados de entrega que você digitou.
          São usados só para o funcionamento do site e você pode apagá-los limpando os dados do navegador.
        </p>

        <h2>Por quanto tempo guardamos</h2>
        <p>
          Os pedidos ficam guardados pelo tempo necessário para o funcionamento do serviço, para a cobrança de
          comissões e para cumprir obrigações legais.
        </p>

        <h2>Seus direitos</h2>
        <p>
          Você pode pedir acesso, correção, anonimização ou exclusão dos seus dados, entre outros direitos previstos na
          LGPD. Escreva para <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
        </p>
      </main>
      <Rodape />
    </>
  );
}
