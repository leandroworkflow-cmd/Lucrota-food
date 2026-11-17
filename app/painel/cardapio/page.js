'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePainel } from '../../../components/PainelShell';
import { brl, parseValor } from '../../../lib/format';
import { supabase } from '../../../lib/supabase';

const VAZIO = { nome: '', categoria: '', preco: '', descricao: '' };

function Formulario({ inicial, categorias, rotuloBotao, onSalvar, onCancelar }) {
  const [f, setF] = useState(inicial);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const campo = (n) => (e) => setF((x) => ({ ...x, [n]: e.target.value }));

  async function enviar(ev) {
    ev.preventDefault();
    const preco = parseValor(f.preco);
    if (f.nome.trim().length < 2) return setErro('Informe o nome do item.');
    if (!(preco >= 0) || preco > 5000) return setErro('Informe um preço válido.');
    setSalvando(true);
    setErro('');
    const erroSalvar = await onSalvar({
      nome: f.nome.trim().slice(0, 80),
      categoria: f.categoria.trim().slice(0, 30) || 'Geral',
      preco: Math.round(preco * 100) / 100,
      descricao: f.descricao.trim().slice(0, 160) || null,
    });
    setSalvando(false);
    if (erroSalvar) setErro(erroSalvar);
    else if (!onCancelar) setF(VAZIO);
  }

  const id = `f-${inicial.nome || 'novo'}`.replace(/\W/g, '');
  return (
    <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="campo">
        <label htmlFor={`${id}-n`}>Nome do item</label>
        <input id={`${id}-n`} className="input" required value={f.nome} onChange={campo('nome')} maxLength={80} />
      </div>
      <div className="linha-campos">
        <div className="campo">
          <label htmlFor={`${id}-p`}>Preço (R$)</label>
          <input id={`${id}-p`} className="input" required inputMode="decimal" placeholder="0,00" value={f.preco} onChange={campo('preco')} />
        </div>
        <div className="campo">
          <label htmlFor={`${id}-c`}>Categoria</label>
          <input id={`${id}-c`} className="input" list={`${id}-cats`} placeholder="Ex.: Lanches" value={f.categoria} onChange={campo('categoria')} maxLength={30} />
          <datalist id={`${id}-cats`}>
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="campo">
        <label htmlFor={`${id}-d`}>Descrição (opcional)</label>
        <input id={`${id}-d`} className="input" value={f.descricao} onChange={campo('descricao')} maxLength={160} />
      </div>
      {erro && (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      )}
      <div className="opcoes">
        <button type="submit" className="btn btn-primario btn-pequeno" disabled={salvando}>
          {salvando ? 'Salvando…' : rotuloBotao}
        </button>
        {onCancelar && (
          <button type="button" className="btn btn-pequeno" onClick={onCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

export default function Cardapio() {
  const { loja } = usePainel();
  const [produtos, setProdutos] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('dl_produtos')
      .select('*')
      .eq('loja_id', loja.id)
      .order('categoria')
      .order('ordem')
      .order('nome');
    if (error) setErro('Não consegui carregar o cardápio.');
    else {
      setErro('');
      setProdutos(data);
    }
    setCarregado(true);
  }, [loja.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const categorias = useMemo(() => [...new Set(produtos.map((p) => p.categoria))], [produtos]);
  const agrupado = useMemo(() => {
    const mapa = new Map();
    for (const p of produtos) {
      if (!mapa.has(p.categoria)) mapa.set(p.categoria, []);
      mapa.get(p.categoria).push(p);
    }
    return [...mapa.entries()];
  }, [produtos]);

  async function criar(dados) {
    const { error } = await supabase.from('dl_produtos').insert({ ...dados, loja_id: loja.id });
    if (error) return 'Não consegui salvar o item. Tente de novo.';
    carregar();
    return null;
  }

  async function atualizar(id, dados) {
    const { error } = await supabase.from('dl_produtos').update(dados).eq('id', id);
    if (error) return 'Não consegui salvar a alteração.';
    setEditando(null);
    carregar();
    return null;
  }

  async function excluir(p) {
    if (!window.confirm(`Excluir "${p.nome}" do cardápio?`)) return;
    const { error } = await supabase.from('dl_produtos').delete().eq('id', p.id);
    if (error) setErro('Não consegui excluir o item.');
    else carregar();
  }

  return (
    <>
      <div className="painel-topo-linha">
        <h1>Cardápio</h1>
        <a className="btn btn-pequeno" href={`/loja/${loja.slug}`} target="_blank" rel="noopener noreferrer">
          Ver como o cliente vê
        </a>
      </div>

      {erro && (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      )}

      <section className="cartao" aria-labelledby="novo-item">
        <h2 id="novo-item">Adicionar item</h2>
        <Formulario inicial={VAZIO} categorias={categorias} rotuloBotao="Adicionar ao cardápio" onSalvar={criar} />
      </section>

      {!carregado ? (
        <p className="muted">Carregando…</p>
      ) : produtos.length === 0 ? (
        <p className="muted">Seu cardápio está vazio. Adicione o primeiro item acima.</p>
      ) : (
        agrupado.map(([categoria, itens]) => (
          <section key={categoria} className="cartao" aria-label={categoria}>
            <h2>{categoria}</h2>
            <div>
              {itens.map((p) =>
                editando === p.id ? (
                  <div key={p.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--linha)' }}>
                    <Formulario
                      inicial={{ nome: p.nome, categoria: p.categoria, preco: String(p.preco).replace('.', ','), descricao: p.descricao || '' }}
                      categorias={categorias}
                      rotuloBotao="Salvar alterações"
                      onSalvar={(dados) => atualizar(p.id, dados)}
                      onCancelar={() => setEditando(null)}
                    />
                  </div>
                ) : (
                  <div key={p.id} className={p.ativo ? 'produto-linha' : 'produto-linha inativo'}>
                    <div>
                      <strong>{p.nome}</strong>
                      {!p.ativo && <span className="muted"> (pausado)</span>}
                      {p.descricao && <div className="muted" style={{ fontSize: 14 }}>{p.descricao}</div>}
                    </div>
                    <strong>{brl(p.preco)}</strong>
                    <div className="opcoes" style={{ gridColumn: '1 / -1' }}>
                      <button type="button" className="btn btn-pequeno" onClick={() => setEditando(p.id)}>
                        Editar
                      </button>
                      <button type="button" className="btn btn-pequeno" onClick={() => atualizar(p.id, { ativo: !p.ativo })}>
                        {p.ativo ? 'Pausar (acabou)' : 'Voltar a vender'}
                      </button>
                      <button type="button" className="btn btn-pequeno" onClick={() => excluir(p)}>
                        Excluir
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        ))
      )}
    </>
  );
}
