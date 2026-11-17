import { corDaLoja, inicial } from '../lib/visual';

// Logo redondo da loja. Sem logo, mostra a inicial sobre a cor da loja.
export default function LogoLoja({ loja, tamanho = 64, className = '' }) {
  const estilo = { width: tamanho, height: tamanho, fontSize: tamanho * 0.46 };
  if (loja.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={loja.logo_url} alt="" className={`logo-loja ${className}`} style={estilo} loading="lazy" />
    );
  }
  return (
    <span className={`logo-loja logo-inicial ${className}`} style={{ ...estilo, background: corDaLoja(loja.slug) }} aria-hidden="true">
      {inicial(loja.nome)}
    </span>
  );
}
