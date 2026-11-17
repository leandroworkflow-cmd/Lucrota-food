import Link from 'next/link';
import Marca from '../../components/Marca';
import Rodape from '../../components/Rodape';
import { SITE } from '../../lib/site';

export const metadata = {
  title: 'Cadastre sua loja',
  description: `Cadastre sua loja no ${SITE.nome} e receba pedidos pelo celular. Cardápio com fotos, aviso de pedido novo e sem mensalidade: você paga só uma comissão por pedido.`,
  alternates: { canonical: '/lojistas' },
};

const TIPOS = [
  { emoji: '🍛', nome: 'Restaurantes', texto: 'Mais pedidos, mais faturamento!' },
  { emoji: '🍧', nome: 'Açaí', texto: 'Seu sabor sempre em alta!' },
  { emoji: '🧁', nome: 'Doces', texto: 'Delícias que vendem muito!' },
];

const VANTAGENS = [
  { ic: '🚀', t: 'Aumente suas vendas' },
  { ic: '📈', t: 'Divulgue sua loja para mais clientes' },
  { ic: '🤝', t: 'Suporte especializado' },
  { ic: '✅', t: 'Cadastro rápido e sem burocracia' },
];

export default function Lojistas() {
  return (
    <>
      <header className="lj-hero">
        <div className="pagina">
          <div className="topo-linha">
            <Marca />
            <Link href="/" className="topo-pill">
              Ver lojas
            </Link>
          </div>
          <h1>
            Seu negócio ainda mais
            <span className="script">perto dos clientes!</span>
          </h1>
          <p>
            Cadastre sua loja no <strong style={{ color: 'var(--amarelo)' }}>{SITE.nome}</strong> e receba pedidos pelo celular, com um app completo e fácil de usar.
          </p>
          <Link href="/painel" className="btn-amarelo">
            Cadastrar minha loja <span aria-hidden="true">›</span>
          </Link>
        </div>
      </header>

      <main className="pagina">
        <section className="lj-tipos" aria-label="Para quem é">
          {TIPOS.map((t) => (
            <article key={t.nome} className="lj-tipo">
              <span className="lj-tipo-icone" aria-hidden="true">
                {t.emoji}
              </span>
              <div>
                <h2>{t.nome}</h2>
                <p>{t.texto}</p>
              </div>
            </article>
          ))}
        </section>

        <ul className="lj-vantagens">
          {VANTAGENS.map((v) => (
            <li key={v.t}>
              <span className="ic" aria-hidden="true">
                {v.ic}
              </span>
              {v.t}
            </li>
          ))}
        </ul>

        <section className="lj-passos">
          <h2 style={{ margin: 0, fontSize: 22 }}>Como funciona</h2>
          <ol>
            <li>Entre com sua conta Google e cadastre a loja.</li>
            <li>Monte o cardápio com fotos e preços.</li>
            <li>Depois da liberação, o cliente pede e você recebe o aviso no celular.</li>
            <li>Sem mensalidade: a comissão é cobrada só sobre os produtos de cada pedido.</li>
          </ol>
        </section>

        <Link href="/painel" className="lj-cta">
          <span style={{ fontSize: 40 }} aria-hidden="true">
            🏪
          </span>
          <div>
            <strong>Cadastre sua loja agora!</strong>
            <span>Faça parte do {SITE.nome} e leve seu negócio para o próximo nível.</span>
          </div>
          <span className="seta" aria-hidden="true">
            ›
          </span>
        </Link>

        <p className="lj-fecho script">Juntos, conectando sua loja aos clientes!</p>
      </main>
      <Rodape />
    </>
  );
}
