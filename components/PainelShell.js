'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { entrarComGoogle, sair, useSession } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { SITE } from '../lib/site';
import Marca from './Marca';

const Ctx = createContext(null);
export const usePainel = () => useContext(Ctx);

const ABAS = [
  ['/painel', 'Pedidos'],
  ['/painel/cardapio', 'Cardápio'],
  ['/painel/loja', 'Minha loja'],
  ['/painel/financeiro', 'Conta'],
];

export default function PainelShell({ children }) {
  const auth = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [loja, setLoja] = useState(undefined); // undefined = carregando, null = ainda não criou
  const [erro, setErro] = useState('');
  const user = auth.session?.user;

  const recarregarLoja = useCallback(async () => {
    if (!supabase || !user) return;
    const { data, error } = await supabase.from('dl_lojas').select('*').eq('dono_id', user.id).maybeSingle();
    if (error) {
      setErro('Não consegui carregar sua loja. Confira a internet e recarregue a página.');
      return;
    }
    setErro('');
    setLoja(data || null);
  }, [user]);

  useEffect(() => {
    if (auth.status === 'in') recarregarLoja();
    if (auth.status === 'out') setLoja(undefined);
  }, [auth.status, recarregarLoja]);

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  // Quem ainda não tem loja vai direto para o cadastro dela
  useEffect(() => {
    if (loja === null && pathname !== '/painel/loja') router.replace('/painel/loja');
  }, [loja, pathname, router]);

  const cabecalho = (
    <header className="topo">
      <div className="pagina pagina-larga topo-in">
        <Marca />
        {auth.status === 'in' && (
          <button type="button" className="topo-link" style={{ background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontWeight: 600 }} onClick={sair}>
            Sair
          </button>
        )}
      </div>
    </header>
  );

  if (auth.status === 'off') {
    return (
      <>
        {cabecalho}
        <main className="pagina" style={{ paddingTop: 32 }}>
          <div className="aviso aviso-erro">O login ainda não foi configurado neste site.</div>
        </main>
      </>
    );
  }

  if (auth.status === 'loading') {
    return (
      <>
        {cabecalho}
        <main className="pagina" style={{ paddingTop: 32 }}>
          <p className="muted">Carregando…</p>
        </main>
      </>
    );
  }

  if (auth.status === 'out') {
    return (
      <>
        {cabecalho}
        <main className="pagina" style={{ paddingTop: 40, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h1 style={{ fontSize: 'clamp(30px, 7vw, 44px)' }}>Receba os pedidos da sua loja pelo celular.</h1>
          <p className="muted" style={{ margin: 0, fontSize: 18, maxWidth: '46ch' }}>
            Cadastre seu cardápio, receba o pedido com aviso no celular e pague só uma comissão sobre o que
            vender. Sem mensalidade.
          </p>
          <div>
            <button type="button" className="btn btn-primario" onClick={() => entrarComGoogle()}>
              Entrar com Google
            </button>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            Ao entrar, você aceita os <Link href="/termos">termos de uso</Link> e a{' '}
            <Link href="/privacidade">política de privacidade</Link> do {SITE.nome}.
          </p>
        </main>
      </>
    );
  }

  const carregando = loja === undefined && !erro;
  const valor = { user, session: auth.session, loja, recarregarLoja };

  return (
    <Ctx.Provider value={valor}>
      {cabecalho}
      {loja && (
        <nav className="painel-nav" aria-label="Painel">
          {ABAS.map(([href, rotulo]) => (
            <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}>
              {rotulo}
            </Link>
          ))}
        </nav>
      )}
      <main className="pagina pagina-larga painel-corpo">
        {erro && (
          <div className="aviso aviso-erro" role="alert">
            {erro}
          </div>
        )}
        {loja && !loja.ativa && (
          <div className="aviso" role="status">
            <strong>Sua loja está em análise.</strong> Assim que for liberada, ela aparece para os clientes. Você
            já pode montar o cardápio.
          </div>
        )}
        {carregando ? (
          <p className="muted">Carregando sua loja…</p>
        ) : (
          // sem loja, só a tela de cadastro aparece (as outras precisam de uma loja)
          (loja || pathname === '/painel/loja') && children
        )}
      </main>
    </Ctx.Provider>
  );
}
