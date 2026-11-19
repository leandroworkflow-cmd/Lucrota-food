'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import CampoImagem from '../../../components/CampoImagem';
import Mapa from '../../../components/Mapa';
import { api } from '../../../lib/api-cliente';
import { noBrasil } from '../../../lib/geo';
import { usePainel } from '../../../components/PainelShell';
import { normalizarTelefone, parseValor, slugify, formatarTelefone } from '../../../lib/format';
import { SITE } from '../../../lib/site';
import { supabase } from '../../../lib/supabase';

export default function MinhaLoja() {
  const { user, loja, recarregarLoja } = usePainel();
  const router = useRouter();
  const nova = !loja;
  const [f, setF] = useState({
    nome: loja?.nome || '',
    slug: loja?.slug || '',
    categoria: loja?.categoria || '',
    descricao: loja?.descricao || '',
    whatsapp: loja?.whatsapp ? formatarTelefone(loja.whatsapp) : '',
    endereco: loja?.endereco || '',
    bairro: loja?.bairro || '',
    cidade: loja?.cidade || SITE.cidade,
    taxa_entrega: loja ? String(loja.taxa_entrega).replace('.', ',') : '',
    pedido_minimo: loja ? String(loja.pedido_minimo).replace('.', ',') : '',
    tempo_estimado: loja?.tempo_estimado || '40-60 min',
    logo_url: loja?.logo_url || '',
    capa_url: loja?.capa_url || '',
    chave_pix: loja?.chave_pix || '',
  });
  const [ponto, setPonto] = useState(loja && Number.isFinite(loja.lat) ? { lat: loja.lat, lng: loja.lng } : null);
  const [aceitaPlataforma, setAceitaPlataforma] = useState(loja ? loja.aceita_plataforma !== false : true);
  const [avisoGeo, setAvisoGeo] = useState('');
  const [buscandoGeo, setBuscandoGeo] = useState(false);
  const [slugEditado, setSlugEditado] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [salvando, setSalvando] = useState(false);

  const campo = (n) => (e) => setF((x) => ({ ...x, [n]: e.target.value }));

  function mudarNome(e) {
    const nome = e.target.value;
    setF((x) => ({ ...x, nome, slug: nova && !slugEditado ? slugify(nome) : x.slug }));
  }

  async function salvar(ev) {
    ev.preventDefault();
    setErro('');
    setOk('');
    const whatsapp = normalizarTelefone(f.whatsapp);
    const taxa = f.taxa_entrega.trim() ? parseValor(f.taxa_entrega) : 0;
    const minimo = f.pedido_minimo.trim() ? parseValor(f.pedido_minimo) : 0;
    if (f.nome.trim().length < 2) return setErro('Informe o nome da loja.');
    if (nova && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug)) return setErro('O endereço da loja deve ter só letras minúsculas, números e hífen.');
    if (nova && f.slug.length < 3) return setErro('O endereço da loja precisa de pelo menos 3 letras.');
    if (!whatsapp) return setErro('Informe um WhatsApp com DDD. É por ele que o cliente fala com você.');
    if (!(taxa >= 0 && taxa <= 100)) return setErro('A taxa de entrega deve ficar entre R$ 0 e R$ 100.');
    if (!(minimo >= 0 && minimo <= 1000)) return setErro('O pedido mínimo deve ficar entre R$ 0 e R$ 1.000.');

    const dados = {
      nome: f.nome.trim(),
      categoria: f.categoria.trim() || null,
      descricao: f.descricao.trim() || null,
      whatsapp,
      endereco: f.endereco.trim() || null,
      bairro: f.bairro.trim() || null,
      cidade: f.cidade.trim() || null,
      taxa_entrega: taxa,
      pedido_minimo: minimo,
      tempo_estimado: f.tempo_estimado.trim() || null,
      logo_url: f.logo_url || null,
      capa_url: f.capa_url || null,
      chave_pix: f.chave_pix.trim() || null,
      lat: ponto?.lat ?? null,
      lng: ponto?.lng ?? null,
      aceita_plataforma: aceitaPlataforma,
    };

    setSalvando(true);
    const { error } = nova
      ? await supabase.from('dl_lojas').insert({ ...dados, slug: f.slug, dono_id: user.id })
      : await supabase.from('dl_lojas').update(dados).eq('id', loja.id);
    setSalvando(false);

    if (error) {
      if (error.code === '23505' && String(error.message).includes('slug')) {
        return setErro('Já existe uma loja com esse endereço. Escolha outro.');
      }
      if (error.code === '23514') return setErro('Algum campo está fora do limite permitido. Revise os valores.');
      return setErro('Não consegui salvar. Tente de novo.');
    }
    await recarregarLoja();
    if (nova) router.replace('/painel/cardapio');
    else setOk('Dados salvos.');
  }

  function daLocalizacaoAtual() {
    setAvisoGeo('');
    if (!('geolocation' in navigator)) return setAvisoGeo('Este aparelho não permite pegar a localização.');
    setBuscandoGeo(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBuscandoGeo(false);
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!noBrasil(p.lat, p.lng)) return setAvisoGeo('A localização pegada parece fora do Brasil. Marque o ponto no mapa.');
        setPonto(p);
        setAvisoGeo('Localização marcada. Se precisar, toque no mapa para ajustar o ponto.');
      },
      () => {
        setBuscandoGeo(false);
        setAvisoGeo('Não consegui pegar a localização. Use a busca pelo endereço ou toque no mapa.');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function doEndereco() {
    setAvisoGeo('');
    const texto = [f.endereco, f.bairro, f.cidade, 'Brasil'].filter((x) => x && x.trim()).join(', ');
    setBuscandoGeo(true);
    try {
      const r = await api(`/api/geo?q=${encodeURIComponent(texto)}`);
      setPonto({ lat: r.lat, lng: r.lng });
      setAvisoGeo('Encontrei o endereço. Confira no mapa e toque para ajustar, se precisar.');
    } catch (e) {
      setAvisoGeo(e.message);
    }
    setBuscandoGeo(false);
  }

  const taxa = f.taxa_entrega.trim() ? parseValor(f.taxa_entrega) : 0;
  const mensagemConvite = loja
    ? `Quer fazer entregas para a ${loja.nome}? Entre em ${SITE.url}/entregador e use o código ${loja.codigo_entregador}.`
    : '';

  return (
    <>
      <h1 style={{ fontSize: 28 }}>{nova ? 'Cadastre sua loja' : 'Minha loja'}</h1>
      {nova && (
        <p className="muted" style={{ margin: 0 }}>
          Preencha os dados da loja. Depois você monta o cardápio e, quando liberarmos, os clientes já podem pedir.
        </p>
      )}

      <form className="cartao" onSubmit={salvar}>
        <div className="linha-campos">
          <CampoImagem rotulo="Logo da loja" formato="redondo" maxLado={400} userId={user.id} valor={f.logo_url} onChange={(v) => setF((x) => ({ ...x, logo_url: v }))} />
          <CampoImagem rotulo="Foto de capa" formato="largo" maxLado={1200} userId={user.id} valor={f.capa_url} onChange={(v) => setF((x) => ({ ...x, capa_url: v }))} />
        </div>

        <div className="campo">
          <label htmlFor="nome">Nome da loja</label>
          <input id="nome" className="input" required maxLength={60} value={f.nome} onChange={mudarNome} />
        </div>

        <div className="campo">
          <label htmlFor="slug">Endereço na internet</label>
          <input
            id="slug"
            className="input"
            required
            maxLength={40}
            disabled={!nova}
            value={f.slug}
            onChange={(e) => {
              setSlugEditado(true);
              setF((x) => ({ ...x, slug: slugify(e.target.value) }));
            }}
          />
          <small>
            {SITE.url.replace(/^https?:\/\//, '')}/loja/<strong>{f.slug || 'nome-da-loja'}</strong>
            {!nova && ' (não pode ser mudado depois de criado)'}
          </small>
        </div>

        <div className="linha-campos">
          <div className="campo">
            <label htmlFor="cat">Tipo de loja</label>
            <input id="cat" className="input" placeholder="Ex.: Lanchonete" maxLength={30} value={f.categoria} onChange={campo('categoria')} />
          </div>
          <div className="campo">
            <label htmlFor="wa">WhatsApp da loja</label>
            <input id="wa" className="input" required type="tel" inputMode="tel" placeholder="(31) 99999-9999" value={f.whatsapp} onChange={campo('whatsapp')} />
          </div>
        </div>

        <div className="campo">
          <label htmlFor="desc">Descrição curta (opcional)</label>
          <input id="desc" className="input" maxLength={200} value={f.descricao} onChange={campo('descricao')} />
        </div>

        <div className="campo">
          <label htmlFor="end">Endereço da loja</label>
          <input id="end" className="input" maxLength={120} value={f.endereco} onChange={campo('endereco')} />
        </div>
        <div className="linha-campos">
          <div className="campo">
            <label htmlFor="bairro">Bairro</label>
            <input id="bairro" className="input" maxLength={60} value={f.bairro} onChange={campo('bairro')} />
          </div>
          <div className="campo">
            <label htmlFor="cidade">Cidade</label>
            <input id="cidade" className="input" maxLength={60} value={f.cidade} onChange={campo('cidade')} />
          </div>
        </div>

        <div className="linha-campos">
          <div className="campo">
            <label htmlFor="taxa">Taxa de entrega (R$)</label>
            <input id="taxa" className="input" inputMode="decimal" placeholder="0 = grátis" value={f.taxa_entrega} onChange={campo('taxa_entrega')} />
          </div>
          <div className="campo">
            <label htmlFor="min">Pedido mínimo (R$)</label>
            <input id="min" className="input" inputMode="decimal" placeholder="0 = sem mínimo" value={f.pedido_minimo} onChange={campo('pedido_minimo')} />
          </div>
        </div>
        <div className="campo">
          <label htmlFor="tempo">Tempo de entrega</label>
          <input id="tempo" className="input" maxLength={20} placeholder="40-60 min" value={f.tempo_estimado} onChange={campo('tempo_estimado')} />
        </div>

        <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 700, marginBottom: 6 }}>Localização da loja no mapa</legend>
          <small className="muted">É daqui que o entregador retira o pedido e que o cliente vê a loja no mapa.</small>
          <div className="opcoes" style={{ margin: '8px 0' }}>
            <button type="button" className="btn btn-pequeno" onClick={daLocalizacaoAtual} disabled={buscandoGeo}>
              📍 Estou na loja agora
            </button>
            <button type="button" className="btn btn-pequeno" onClick={doEndereco} disabled={buscandoGeo || f.endereco.trim().length < 3}>
              🔎 Achar pelo endereço
            </button>
          </div>
          {avisoGeo && (
            <small role="status" style={{ display: 'block', marginBottom: 8 }}>
              {avisoGeo}
            </small>
          )}
          {ponto && (
            <Mapa
              pontos={[{ id: 'loja', tipo: 'loja', lat: ponto.lat, lng: ponto.lng, rotulo: f.nome || 'Sua loja' }]}
              altura={220}
              aoClicar={(lat, lng) => setPonto({ lat, lng })}
              rotuloMapa="Localização da loja. Toque para mudar o ponto."
            />
          )}
        </fieldset>

        <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 700, marginBottom: 6 }}>Entregadores</legend>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <input type="checkbox" checked={aceitaPlataforma} onChange={(e) => setAceitaPlataforma(e.target.checked)} style={{ marginTop: 4 }} />
            <span>
              Aceitar também entregadores da plataforma
              <small className="muted" style={{ display: 'block' }}>
                Quando você chama um entregador, os seus próprios e os aprovados da plataforma podem aceitar. Desmarque para só os seus.
              </small>
            </span>
          </label>
          {!nova && (
            <div className="entrega-info" style={{ marginTop: 10 }}>
              <span>
                Código dos seus entregadores: <strong>{loja.codigo_entregador || '(rode o SQL 04)'}</strong>
              </span>
              {loja.codigo_entregador && (
                <a href={`https://wa.me/?text=${encodeURIComponent(mensagemConvite)}`} target="_blank" rel="noopener noreferrer">
                  Convidar pelo WhatsApp
                </a>
              )}
            </div>
          )}
        </fieldset>

        <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 700, marginBottom: 6 }}>Repasses e conta corrente</legend>
          <small className="muted" style={{ display: 'block', marginBottom: 8 }}>
            Pedidos pagos por <strong>Pix pelo app</strong> caem na conta da plataforma, que repassa a você o valor dos produtos menos a comissão{nova ? '' : ` de ${Number(loja.comissao_pct)}%`}.
            Pedidos pagos em <strong>dinheiro</strong> ficam com você, e a comissão é descontada na sua conta corrente. Os dois se compensam: você vê o saldo na aba Conta.
          </small>
          <div className="campo">
            <label htmlFor="chave-pix">Sua chave Pix para receber os repasses</label>
            <input id="chave-pix" className="input" maxLength={140} placeholder="CPF/CNPJ, e-mail, telefone ou chave aleatória" value={f.chave_pix} onChange={campo('chave_pix')} />
          </div>
        </fieldset>

        {erro && (
          <div className="aviso aviso-erro" role="alert">
            {erro}
          </div>
        )}
        {ok && (
          <div className="aviso aviso-ok" role="status">
            {ok}
          </div>
        )}
        <button type="submit" className="btn btn-primario" disabled={salvando}>
          {salvando ? 'Salvando…' : nova ? 'Cadastrar loja' : 'Salvar dados'}
        </button>
      </form>
    </>
  );
}
