'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api-cliente';
import { entrarComGoogle, sair, useSession } from '../lib/auth';
import { mascaraCpf, validarCartaoDigitado } from '../lib/cartao';
import { tokenizarCartao } from '../lib/mp-cliente';
import CartaoForm from './CartaoForm';

const VAZIO = { tipo: 'credit_card', numero: '', nome: '', validade: '', cvv: '', cpf: '' };

export default function ContaCliente({ chaveMP }) {
  const auth = useSession();
  const [conta, setConta] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [cartao, setCartao] = useState(VAZIO);
  const [adicionando, setAdicionando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const carregar = useCallback(async () => {
    try {
      const c = await api('/api/conta');
      setConta(c);
      setPerfil((p) => p || c.perfil);
    } catch (e) {
      setErro(e.message);
    }
  }, []);

  useEffect(() => {
    if (auth.status === 'in') carregar();
  }, [auth.status, carregar]);

  async function salvarPerfil(ev) {
    ev.preventDefault();
    setErro('');
    setAviso('');
    setOcupado(true);
    try {
      await api('/api/conta', { metodo: 'PUT', corpo: perfil });
      setAviso('Dados salvos. Eles já vêm preenchidos nos próximos pedidos.');
    } catch (e) {
      setErro(e.message);
    }
    setOcupado(false);
  }

  async function adicionarCartao(ev) {
    ev.preventDefault();
    setErro('');
    setAviso('');
    const v = validarCartaoDigitado(cartao);
    if (v.erro) return setErro(v.erro);
    setOcupado(true);
    try {
      const t = await tokenizarCartao(chaveMP, { ...cartao, tipo: 'credit_card' });
      await api('/api/conta/cartoes', { metodo: 'POST', corpo: { token: t.token } });
      setCartao(VAZIO);
      setAdicionando(false);
      setAviso('Cartão salvo.');
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
    setOcupado(false);
  }

  async function remover(c) {
    if (!window.confirm(`Remover o cartão ${c.bandeira} final ${c.final}?`)) return;
    setErro('');
    setOcupado(true);
    try {
      await api('/api/conta/cartoes', { metodo: 'DELETE', corpo: { id: c.id } });
      setAviso('Cartão removido.');
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
    setOcupado(false);
  }

  if (auth.status === 'loading') return <p className="muted">Carregando…</p>;
  if (auth.status === 'off') return <div className="aviso aviso-erro">O login ainda não foi configurado neste site.</div>;
  if (auth.status === 'out') {
    return (
      <section className="vazio">
        <h2>Entre para pedir mais rápido.</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Com a conta você salva seus dados e cartões, paga com um toque e vê seus pedidos em qualquer aparelho.
        </p>
        <button type="button" className="btn btn-primario" onClick={() => entrarComGoogle('/conta')}>
          Entrar com Google
        </button>
      </section>
    );
  }

  const campo = (n) => (e) => setPerfil((p) => ({ ...p, [n]: e.target.value }));
  return (
    <>
      {erro && (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      )}
      {aviso && (
        <div className="aviso" role="status">
          {aviso}
        </div>
      )}
      {!conta || !perfil ? (
        !erro && <p className="muted">Carregando…</p>
      ) : (
        <>
          <form className="bloco" onSubmit={salvarPerfil}>
            <h3>Seus dados</h3>
            <p className="muted" style={{ margin: 0 }}>{perfil.email}</p>
            <div className="campo">
              <label htmlFor="c-nome">Nome</label>
              <input id="c-nome" className="input" value={perfil.nome} onChange={campo('nome')} autoComplete="name" />
            </div>
            <div className="campo">
              <label htmlFor="c-tel">Telefone com DDD</label>
              <input id="c-tel" className="input" type="tel" inputMode="tel" value={perfil.telefone} onChange={campo('telefone')} autoComplete="tel" placeholder="(31) 99999-9999" />
            </div>
            <div className="campo">
              <label htmlFor="c-end">Rua e número</label>
              <input id="c-end" className="input" value={perfil.endereco} onChange={campo('endereco')} autoComplete="street-address" />
            </div>
            <div className="linha-campos">
              <div className="campo">
                <label htmlFor="c-bairro">Bairro</label>
                <input id="c-bairro" className="input" value={perfil.bairro} onChange={campo('bairro')} />
              </div>
              <div className="campo">
                <label htmlFor="c-comp">Complemento</label>
                <input id="c-comp" className="input" value={perfil.complemento} onChange={campo('complemento')} />
              </div>
            </div>
            <div>
              <button type="submit" className="btn btn-primario" disabled={ocupado}>
                Salvar dados
              </button>
            </div>
          </form>

          <section className="bloco">
            <h3>Cartões salvos</h3>
            {conta.cartoes.length === 0 && <p className="muted" style={{ margin: 0 }}>Nenhum cartão salvo ainda.</p>}
            {conta.cartoes.map((c) => (
              <div key={c.id} className="linha-sacola">
                <div>
                  <strong>
                    {c.bandeira} •••• {c.final}
                  </strong>
                  <div className="muted" style={{ fontSize: 14 }}>{c.validade ? `Vence em ${c.validade}` : ''}</div>
                </div>
                <button type="button" className="btn btn-pequeno" disabled={ocupado} onClick={() => remover(c)}>
                  Remover
                </button>
              </div>
            ))}
            {chaveMP ? (
              adicionando ? (
                <form onSubmit={adicionarCartao} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <CartaoForm valor={cartao} onChange={setCartao} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" className="btn btn-primario" disabled={ocupado}>
                      {ocupado ? 'Salvando…' : 'Salvar cartão'}
                    </button>
                    <button type="button" className="btn" onClick={() => setAdicionando(false)}>
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <button type="button" className="btn btn-pequeno" onClick={() => setAdicionando(true)}>
                    Adicionar cartão
                  </button>
                </div>
              )
            ) : (
              <p className="muted" style={{ margin: 0 }}>Cartões salvos ainda não estão disponíveis.</p>
            )}
            <small className="muted">O número do cartão fica guardado no Mercado Pago, nunca aqui. O CVV não é salvo: você digita a cada compra.</small>
          </section>

          <section className="bloco">
            <h3>Pedidos</h3>
            <Link href="/meus-pedidos" className="btn btn-pequeno">
              Ver meus pedidos
            </Link>
          </section>

          <div>
            <button type="button" className="btn" onClick={sair}>
              Sair da conta
            </button>
          </div>
        </>
      )}
    </>
  );
}
