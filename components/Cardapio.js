'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { brl, parseValor, round2 } from '../lib/format';
import { FORMAS, FORMAS_ATIVAS } from '../lib/pedido';
import { guardarPedido } from '../lib/meus-pedidos';
import { emojiDoItem } from '../lib/visual';
import { validarCartaoDigitado } from '../lib/cartao';
import { api } from '../lib/api-cliente';
import { entrarComGoogle, useSession } from '../lib/auth';
import { montarCvv, tokenizarCartao, tokenizarSalvo } from '../lib/mp-cliente';
import { supabase } from '../lib/supabase';
import CartaoForm from './CartaoForm';

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

export default function Cardapio({ loja, produtos, chaveMP }) {
  const router = useRouter();
  const chaveSacola = `dl:sacola:${loja.slug}`;
  const [sacola, setSacola] = useState({}); // { idProduto: qtd }
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [cliente, setCliente] = useState({ nome: '', telefone: '', endereco: '', bairro: '', complemento: '', email: '' });
  const [forma, setForma] = useState(loja.aceita_pix_app ? 'pix_app' : 'dinheiro');
  const [troco, setTroco] = useState('');
  const [observacao, setObservacao] = useState('');
  const [isca, setIsca] = useState('');
  const [local, setLocal] = useState(null); // { lat, lng } do GPS do cliente (opcional)
  const [buscandoLocal, setBuscandoLocal] = useState(false);
  const [avisoLocal, setAvisoLocal] = useState('');
  const [cartao, setCartao] = useState({ tipo: 'credit_card', numero: '', nome: '', validade: '', cvv: '', cpf: '' });
  const auth = useSession();
  const [conta, setConta] = useState(null); // { perfil, cartoes } de quem está logado
  const [cartaoEscolhido, setCartaoEscolhido] = useState('novo'); // 'novo' ou o id de um cartão salvo
  const [salvarCartao, setSalvarCartao] = useState(true);
  const botaoFechar = useRef(null);

  useEffect(() => {
    const salva = ler(chaveSacola, {});
    const validos = {};
    for (const p of produtos) if (salva[p.id] > 0) validos[p.id] = salva[p.id];
    setSacola(validos);
    setCliente((c) => ({ ...c, ...ler(CHAVE_CLIENTE, {}) }));
  }, [chaveSacola, produtos]);

  // Cliente logado: traz os dados e os cartões salvos.
  useEffect(() => {
    if (auth.status !== 'in') {
      setConta(null);
      return;
    }
    let vivo = true;
    api('/api/conta')
      .then((c) => {
        if (!vivo) return;
        setConta(c);
        if (c.cartoes?.length) setCartaoEscolhido((atual) => (atual === 'novo' ? c.cartoes[0].id : atual));
        setCliente((atual) => ({
          ...atual,
          nome: atual.nome || c.perfil.nome,
          telefone: atual.telefone || c.perfil.telefone,
          endereco: atual.endereco || c.perfil.endereco,
          bairro: atual.bairro || c.perfil.bairro,
          complemento: atual.complemento || c.perfil.complemento,
          email: atual.email || c.perfil.email,
        }));
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [auth.status]);

  // Campo seguro do CVV quando um cartão salvo está escolhido.
  const usandoSalvo = forma === 'cartao_app' && cartaoEscolhido !== 'novo' && Boolean(conta?.cartoes?.length);
  useEffect(() => {
    if (!aberto || !usandoSalvo || !chaveMP) return undefined;
    let remover = () => {};
    let ativo = true;
    montarCvv(chaveMP, 'cvv-salvo').then((r) => {
      if (ativo) remover = r;
      else r();
    }).catch(() => setErro('Não consegui carregar o campo do código de segurança. Recarregue a página.'));
    return () => {
      ativo = false;
      remover();
    };
  }, [aberto, usandoSalvo, cartaoEscolhido, chaveMP]);

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

  function usarMinhaLocalizacao() {
    setAvisoLocal('');
    if (!('geolocation' in navigator)) return setAvisoLocal('Este aparelho não permite pegar a localização.');
    setBuscandoLocal(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocal({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setBuscandoLocal(false);
      },
      () => {
        setBuscandoLocal(false);
        setAvisoLocal('Não consegui pegar a localização. Você pode continuar só com o endereço.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  async function enviar(ev) {
    ev.preventDefault();
    setErro('');
    if (faltaMinimo) {
      setErro(`O pedido mínimo desta loja é ${brl(minimo)}.`);
      return;
    }
    let dadosCartao = null;
    if (forma === 'cartao_app' && !usandoSalvo) {
      const c = validarCartaoDigitado(cartao);
      if (c.erro) return setErro(c.erro);
    }
    setEnviando(true);
    try {
      if (usandoSalvo) dadosCartao = await tokenizarSalvo(chaveMP, cartaoEscolhido);
      else if (forma === 'cartao_app') {
        dadosCartao = await tokenizarCartao(chaveMP, cartao);
        if (conta && salvarCartao) dadosCartao.salvar_token = (await tokenizarCartao(chaveMP, cartao)).token; // um token só serve uma vez: este é para guardar o cartão
      }
      const jwt = (await supabase?.auth.getSession())?.data?.session?.access_token;
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
        body: JSON.stringify({
          slug: loja.slug,
          itens: linhas.map((l) => ({ id: l.id, qtd: l.qtd })),
          lat: local?.lat ?? null,
          lng: local?.lng ?? null,
          cliente,
          forma,
          cartao: dadosCartao,
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
      setCartao((c) => ({ ...c, numero: '', cvv: '' }));
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
              <div>
                <button type="button" className="btn btn-pequeno" onClick={usarMinhaLocalizacao} disabled={buscandoLocal}>
                  {buscandoLocal ? 'Buscando…' : local ? '📍 Localização marcada' : '📍 Usar minha localização'}
                </button>
                <small style={{ display: 'block', marginTop: 6 }} className="muted">
                  {local ? 'O entregador vai direto ao ponto marcado.' : 'Ajuda o entregador a achar você mais rápido. É opcional.'}
                </small>
                {avisoLocal && <small role="alert">{avisoLocal}</small>}
              </div>
            </section>

            <section className="bloco">
              <h3>Como você quer pagar</h3>
              <div className="opcoes" role="group" aria-label="Forma de pagamento">
                {Object.entries(FORMAS)
                  .filter(([id]) => FORMAS_ATIVAS.includes(id))
                  .filter(([id]) => (id !== 'pix_app' && id !== 'cartao_app') || (loja.aceita_pix_app && (id === 'pix_app' || chaveMP)))
                  .map(([id, rotulo]) => (
                  <button key={id} type="button" className="opcao" aria-pressed={forma === id} onClick={() => setForma(id)}>
                    {rotulo}
                  </button>
                  ))}
              </div>
              {forma === 'pix_app' && (
                <div className="campo">
                  <label htmlFor="email">E-mail (opcional)</label>
                  <input id="email" className="input" type="email" autoComplete="email" placeholder="Para o comprovante do Mercado Pago" value={cliente.email} onChange={campo('email')} />
                  <small className="muted">Ao enviar, vamos gerar o QR Code do Pix. A loja só recebe o pedido depois que você pagar.</small>
                </div>
              )}
              {forma === 'cartao_app' && (
                <>
                  {auth.status !== 'in' && (
                    <div className="aviso" role="note">
                      Quer pagar com um toque nos próximos pedidos?{' '}
                      <button type="button" className="topo-link" style={{ background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontWeight: 700, color: 'inherit', textDecoration: 'underline' }} onClick={() => entrarComGoogle(`/loja/${loja.slug}`)}>
                        Entre com o Google
                      </button>{' '}
                      para salvar seu cartão e ver o histórico.
                    </div>
                  )}
                  {conta?.cartoes?.length > 0 && (
                    <div className="opcoes" role="radiogroup" aria-label="Cartão">
                      {conta.cartoes.map((c) => (
                        <button key={c.id} type="button" role="radio" aria-checked={cartaoEscolhido === c.id} className="opcao" aria-pressed={cartaoEscolhido === c.id} onClick={() => setCartaoEscolhido(c.id)}>
                          {c.bandeira} •••• {c.final}
                        </button>
                      ))}
                      <button type="button" role="radio" aria-checked={cartaoEscolhido === 'novo'} className="opcao" aria-pressed={cartaoEscolhido === 'novo'} onClick={() => setCartaoEscolhido('novo')}>
                        Outro cartão
                      </button>
                    </div>
                  )}
                  {usandoSalvo ? (
                    <div className="campo">
                      <label>Código de segurança (CVV)</label>
                      <div id="cvv-salvo" style={{ minHeight: 44 }} />
                      <small className="muted">Pagamento à vista. Por segurança, o CVV é pedido a cada compra.</small>
                    </div>
                  ) : (
                    <>
                      <CartaoForm valor={cartao} onChange={setCartao} />
                      {conta && (
                        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                          <input type="checkbox" checked={salvarCartao} onChange={(e) => setSalvarCartao(e.target.checked)} />
                          Salvar este cartão para os próximos pedidos
                        </label>
                      )}
                    </>
                  )}
                  <div className="campo">
                    <label htmlFor="email">E-mail (opcional)</label>
                    <input id="email" className="input" type="email" autoComplete="email" placeholder="Para o comprovante do Mercado Pago" value={cliente.email} onChange={campo('email')} />
                  </div>
                </>
              )}
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
              {enviando ? (forma === 'cartao_app' ? 'Processando pagamento…' : 'Enviando…') : forma === 'cartao_app' ? `Pagar ${brl(total)} no cartão` : `Enviar pedido de ${brl(total)}`}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
