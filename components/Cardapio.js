'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { brl, parseValor, round2 } from '../lib/format';
import { FORMAS } from '../lib/pedido';
import { guardarPedido } from '../lib/meus-pedidos';
import { emojiDoItem } from '../lib/visual';

const CHAVE_CLIENTE = 'dl:cliente:v1';

function ler(chave, padrao) {
  try {
    const v = JSON.parse(localStorage.getItem(chave) || 'null');
    return v ?? padrao;
  } catch {
    return padrao;
  }
}
function gravar(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // ignora
  }
}

export default function Cardapio({ loja, produtos }) {
  const router = useRouter();
  const chaveSacola = `dl:sacola:${loja.slug}`;
  const [sacola, setSacola] = useState({}); // { idProduto: qtd }
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [cliente, setCliente] = useState({ nome: '', telefone: '', endereco: '', bairro: '', complemento: '' });
  const [forma, setForma] = useState('pix');
  const [troco, setTroco] = useState('');
  const [observacao, setObservacao] = useState('');
  const [isca, setIsca] = useState('');
  const botaoFechar = useRef(null);

  useEffect(() => {
    const salva = ler(chaveSacola, {});
    const validos = {};
    for (const p of produtos) if (salva[p.id] > 0) validos[p.id] = salva[p.id];
    setSacola(validos);
    setCliente((c) => ({ ...c, ...ler(CHAVE_CLIENTE, {}) }));
  }, [chaveSacola, produtos]);

  useEffect(() => {
    if (!aberto) return undefined;
    botaoFechar.current?.focus();
    const esc = (e) => e.key === 'Escape' && setAberto(false);
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [aberto]);

  function mudar(id, delta) {
    setSacola((atual) => {
      const qtd = Math.min(20, Math.max(0, (atual[id] || 0) + delta));
      const proximo = { ...atual };
      if (qtd === 0) delete proximo[id];
      else proximo[id] = qtd;
      gravar(chaveSacola, proximo);
      return proximo;
    });
  }

  const categorias = useMemo(() => {
    const mapa = new Map();
    for (const p of produtos) {
      if (!mapa.has(p.categoria)) mapa.set(p.categoria, []);
      mapa.get(p.categoria).push(p);
    }
    return [...mapa.entries()];
  }, [produtos]);

  const linhas = produtos.filter((p) => sacola[p.id] > 0).map((p) => ({ ...p, qtd: sacola[p.id] }));
  const quantidade = linhas.reduce((s, l) => s + l.qtd, 0);
  const subtotal = round2(linhas.reduce((s, l) => s + Number(l.preco) * l.qtd, 0));
  const taxa = Number(loja.taxa_entrega) || 0;
  const total = round2(subtotal + taxa);
  const minimo = Number(loja.pedido_minimo) || 0;
  const faltaMinimo = subtotal < minimo;

  const campo = (nome) => (e) => setCliente((c) => ({ ...c, [nome]: e.target.value }));

  async function enviar(ev) {
    ev.preventDefault();
    setErro('');
    if (faltaMinimo) {
      setErro(`O pedido mínimo desta loja é ${brl(minimo)}.`);
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: loja.slug,
          itens: linhas.map((l) => ({ id: l.id, qtd: l.qtd })),
          cliente,
          forma,
          troco: forma === 'dinheiro' && troco.trim() ? parseValor(troco) : null,
          observacao,
          site: isca,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Não consegui enviar o pedido.');
      gravar(CHAVE_CLIENTE, cliente);
      gravar(chaveSacola, {});
      setSacola({});
      guardarPedido({ token: json.token, loja: loja.nome, em: Date.now() });
      router.push(`/pedido/${json.token}`);
    } catch (e) {
      setErro(e.message || 'Não consegui enviar o pedido. Confira a internet e tente de novo.');
      setEnviando(false);
    }
  }

  return (
    <>
      {!loja.aberta && (
        <div className="aviso" style={{ marginTop: 16 }} role="status">
          A loja está fechada agora. Você pode ver o cardápio, mas só dá para pedir quando ela abrir.
        </div>
      )}

      {produtos.length === 0 ? (
        <p className="muted" style={{ marginTop: 24 }}>
          Esta loja ainda não cadastrou o cardápio.
        </p>
      ) : (
        <>
          <nav className="categorias" aria-label="Categorias do cardápio">
            {categorias.map(([nome]) => (
              <a key={nome} href={`#cat-${encodeURIComponent(nome)}`}>
                {nome}
              </a>
            ))}
          </nav>

          {categorias.map(([nome, itens]) => (
            <section key={nome} id={`cat-${encodeURIComponent(nome)}`} className="secao-cardapio">
              <h2>{nome}</h2>
              <ul className="itens">
                {itens.map((p) => (
                  <li key={p.id} className="prato">
                    <div className="prato-texto">
                      <span className="item-nome">{p.nome}</span>
                      {p.descricao && <span className="item-desc">{p.descricao}</span>}
                      <span className="item-preco">{brl(p.preco)}</span>
                    </div>
                    <div className="prato-foto">
                      {p.imagem_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imagem_url} alt="" loading="lazy" />
                      ) : (
                        <span className="prato-emoji" aria-hidden="true">
                          {emojiDoItem(p.nome, p.categoria)}
                        </span>
                      )}
                      <div className="prato-acao">
                        {sacola[p.id] > 0 ? (
                          <div className="qtd" role="group" aria-label={`Quantidade de ${p.nome}`}>
                            <button type="button" onClick={() => mudar(p.id, -1)} aria-label={`Tirar um ${p.nome}`}>
                              −
                            </button>
                            <output>{sacola[p.id]}</output>
                            <button type="button" onClick={() => mudar(p.id, 1)} aria-label={`Adicionar mais um ${p.nome}`}>
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="mais"
                            onClick={() => mudar(p.id, 1)}
                            aria-label={`Adicionar ${p.nome} à sacola`}
                            disabled={!loja.aberta}
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      {quantidade > 0 && !aberto && (
        <div className="barra-sacola">
          <button type="button" className="btn btn-amarelo" onClick={() => setAberto(true)}>
            <span>
              Ver sacola ({quantidade} {quantidade === 1 ? 'item' : 'itens'})
            </span>
            <span>{brl(subtotal)}</span>
          </button>
        </div>
      )}

      {aberto && (
        <div className="folha" role="dialog" aria-modal="true" aria-labelledby="titulo-sacola">
          <div className="folha-topo">
            <h2 id="titulo-sacola">Sua sacola</h2>
            <button ref={botaoFechar} type="button" className="btn btn-pequeno" onClick={() => setAberto(false)}>
              Voltar ao cardápio
            </button>
          </div>

          <form className="folha-corpo" onSubmit={enviar}>
            <section className="bloco" aria-label="Itens do pedido">
              {linhas.map((l) => (
                <div key={l.id} className="linha-sacola">
                  <div>
                    <strong>{l.nome}</strong>
                    <div className="muted" style={{ fontSize: 14 }}>
                      {brl(l.preco)} cada
                    </div>
                  </div>
                  <div className="qtd" role="group" aria-label={`Quantidade de ${l.nome}`}>
                    <button type="button" onClick={() => mudar(l.id, -1)} aria-label={`Tirar um ${l.nome}`}>
                      −
                    </button>
                    <output>{l.qtd}</output>
                    <button type="button" onClick={() => mudar(l.id, 1)} aria-label={`Adicionar mais um ${l.nome}`}>
                      +
                    </button>
                  </div>
                </div>
              ))}
              {linhas.length === 0 && <p className="muted">Sua sacola está vazia.</p>}
            </section>

            <section className="bloco">
              <h3>Entrega</h3>
              <div className="campo">
                <label htmlFor="nome">Seu nome</label>
                <input id="nome" className="input" required autoComplete="name" value={cliente.nome} onChange={campo('nome')} />
              </div>
              <div className="campo">
                <label htmlFor="tel">Telefone com DDD</label>
                <input
                  id="tel"
                  className="input"
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(31) 99999-9999"
                  value={cliente.telefone}
                  onChange={campo('telefone')}
                />
              </div>
              <div className="campo">
                <label htmlFor="end">Rua e número</label>
                <input id="end" className="input" required autoComplete="street-address" value={cliente.endereco} onChange={campo('endereco')} />
              </div>
              <div className="linha-campos">
                <div className="campo">
                  <label htmlFor="bairro">Bairro</label>
                  <input id="bairro" className="input" value={cliente.bairro} onChange={campo('bairro')} />
                </div>
                <div className="campo">
                  <label htmlFor="comp">Complemento</label>
                  <input id="comp" className="input" value={cliente.complemento} onChange={campo('complemento')} />
                </div>
              </div>
            </section>

            <section className="bloco">
              <h3>Pagamento na entrega</h3>
              <div className="opcoes" role="group" aria-label="Forma de pagamento">
                {Object.entries(FORMAS).map(([id, rotulo]) => (
                  <button key={id} type="button" className="opcao" aria-pressed={forma === id} onClick={() => setForma(id)}>
                    {rotulo}
                  </button>
                ))}
              </div>
              {forma === 'dinheiro' && (
                <div className="campo">
                  <label htmlFor="troco">Troco para quanto? (opcional)</label>
                  <input id="troco" className="input" inputMode="decimal" placeholder="Ex.: 100" value={troco} onChange={(e) => setTroco(e.target.value)} />
                </div>
              )}
              <div className="campo">
                <label htmlFor="obs">Observações para a loja (opcional)</label>
                <textarea id="obs" className="input" maxLength={200} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
              </div>
              <input className="isca" tabIndex={-1} autoComplete="off" aria-hidden="true" name="site" value={isca} onChange={(e) => setIsca(e.target.value)} />
            </section>

            <section className="totais" aria-label="Resumo">
              <div>
                <span>Produtos</span>
                <span>{brl(subtotal)}</span>
              </div>
              <div>
                <span>Entrega</span>
                <span>{taxa > 0 ? brl(taxa) : 'Grátis'}</span>
              </div>
              <div className="total">
                <span>Total</span>
                <span>{brl(total)}</span>
              </div>
            </section>

            {faltaMinimo && (
              <div className="aviso" role="status">
                Faltam {brl(minimo - subtotal)} para o pedido mínimo de {brl(minimo)}.
              </div>
            )}
            {erro && (
              <div className="aviso aviso-erro" role="alert">
                {erro}
              </div>
            )}

            <button type="submit" className="btn btn-primario btn-bloco" disabled={enviando || linhas.length === 0 || faltaMinimo || !loja.aberta}>
              {enviando ? 'Enviando…' : `Enviar pedido de ${brl(total)}`}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
