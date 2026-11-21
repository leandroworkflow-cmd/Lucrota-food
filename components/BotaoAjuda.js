import { linkSuporte } from '../lib/suporte';

// Abre o WhatsApp da central de ajuda com o número do pedido já escrito.
export default function BotaoAjuda({ papel, numero, loja, bloco = false, rotulo = 'Ajuda no WhatsApp' }) {
  return (
    <a className={bloco ? 'btn btn-bloco' : 'btn btn-pequeno'} href={linkSuporte({ papel, numero, loja })} target="_blank" rel="noopener noreferrer">
      💬 {rotulo}
    </a>
  );
}
