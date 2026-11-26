import Link from 'next/link';
import Marca from '../../components/Marca';
import Rodape from '../../components/Rodape';
import { SITE } from '../../lib/site';

export const metadata = {
  title: 'Seja entregador',
  description: `Faça entregas pelo ${SITE.nome} em ${SITE.cidade} e região. Você escolhe quando trabalhar, navega com Waze ou Google Maps e saca seus ganhos por Pix.`,
  alternates: { canonical: '/seja-entregador' },
};

const VANTAGENS = [
  { ic: '🕒', t: 'Você escolhe quando trabalhar' },
  { ic: '💸', t: 'Saque dos ganhos por Pix' },
  { ic: '🗺️', t: 'Rota no Waze ou Google Maps' },
  { ic: '🔔', t: 'Aviso com som de corrida nova' },
];

const PASSOS = [
  'Entre com a sua conta Google e preencha nome, CPF, telefone, endereço e veículo.',
  'Envie pelo celular as fotos (ou PDFs) dos documentos e tire uma selfie para o reconhecimento facial.',
  'A nossa equipe confere tudo e libera o seu acesso.',
  'Fique online, aceite uma corrida, retire o pedido na loja (com foto) e siga pela rota até o cliente.',
  'Peça o código de 4 números ao cliente para concluir a entrega.',
];

const PERGUNTAS = [
  {
    p: 'Quais documentos eu preciso enviar?',
    r: 'Moto ou carro: CNH (foto ou PDF), documento do veículo (foto ou PDF), comprovante de residência (foto ou PDF) e uma selfie. Bicicleta ou a pé: comprovante de residência e selfie. Em todos os casos você informa o seu CPF e o endereço onde mora.',
  },
  {
    p: 'Preciso ter CNPJ?',
    r: 'Não. Para entregar você só precisa do seu CPF e dos documentos acima.',
  },
  {
    p: 'Como eu recebo?',
    r: 'Nos pedidos pagos pelo app (Pix ou cartão), o ganho da entrega, já descontada a taxa da plataforma, entra no seu saldo e você saca por Pix a partir de R$ 10,00. Nos pedidos pagos em dinheiro, o dinheiro fica com você e a taxa da plataforma (R$ 0,60 por entrega) fica como valor a pagar.',
  },
  {
    p: 'Posso entregar de bicicleta ou a pé?',
    r: 'Pode. Nesses casos não é preciso CNH nem documento de veículo, mas o comprovante de residência e a selfie continuam obrigatórios.',
  },
  {
    p: 'Preciso mandar selfie todo dia?',
    r: 'Sim. Para ficar online você confirma uma selfie do dia. É uma proteção para você e para os clientes.',
  },
];

export default function SejaEntregador() {
  return (
    <>
      <header className="lj-hero cap-hero">
        <div className="cap-grade">
          <div className="cap-texto">
            <div className="topo-linha">
              <Marca />
              <Link href="/" className="topo-pill">
                Ver lojas
              </Link>
            </div>
            <h1>
              Faça entregas e ganhe
              <span className="script">no seu horário!</span>
            </h1>
            <p>
              Entregue pelo <strong style={{ color: 'var(--amarelo)' }}>{SITE.nome}</strong> em {SITE.cidade} e região. Você decide quando ficar online.
            </p>
            <Link href="/entregador" className="btn-amarelo">
              Quero ser entregador <span aria-hidden="true">›</span>
            </Link>
            <small className="cap-nota">Cadastro pelo celular, com conferência dos documentos pela nossa equipe.</small>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="cap-foto" src="/img/hero-entregador.jpg" width={440} height={941} alt="Entregador do Brokê sorrindo, com jaqueta vermelha e bag roxa" />
        </div>
      </header>

      <main className="pagina">
        <ul className="lj-vantagens" style={{ marginTop: 32 }}>
          {VANTAGENS.map((v) => (
            <li key={v.t}>
              <span className="ic" aria-hidden="true">
                {v.ic}
              </span>
              {v.t}
            </li>
          ))}
        </ul>

        <aside className="cap-precisa" aria-label="O que você precisa">
          <strong>Antes de começar, deixe à mão:</strong>
          <ul>
            <li>CPF e o endereço onde você mora</li>
            <li>Comprovante de residência (foto ou PDF)</li>
            <li>Moto ou carro: CNH e documento do veículo (foto ou PDF)</li>
            <li>Uma selfie, tirada na hora, para o reconhecimento facial</li>
          </ul>
        </aside>

        <section className="lj-passos">
          <h2 style={{ margin: 0, fontSize: 22 }}>Como funciona</h2>
          <ol>
            {PASSOS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </section>

        <section className="cap-faq" aria-label="Perguntas frequentes">
          <h2>Perguntas frequentes</h2>
          {PERGUNTAS.map((q) => (
            <details key={q.p}>
              <summary>{q.p}</summary>
              <p>{q.r}</p>
            </details>
          ))}
        </section>

        <Link href="/entregador" className="lj-cta">
          <span style={{ fontSize: 40 }} aria-hidden="true">
            🛵
          </span>
          <div>
            <strong>Comece a entregar!</strong>
            <span>Entre com o Google e envie seus documentos em poucos minutos.</span>
          </div>
          <span className="seta" aria-hidden="true">
            ›
          </span>
        </Link>

        <p style={{ textAlign: 'center', margin: '24px 0 0' }}>
          Tem um negócio? <Link href="/lojistas">Cadastre a sua loja no {SITE.nome}</Link>.
        </p>
      </main>
      <Rodape />
    </>
  );
}
