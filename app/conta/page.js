import ContaCliente from '../../components/ContaCliente';
import Marca from '../../components/Marca';
import NavInferior from '../../components/NavInferior';
import Rodape from '../../components/Rodape';

export const metadata = { title: 'Minha conta', robots: { index: false, follow: false } };

export default function Conta() {
  return (
    <>
      <header className="topo-app">
        <div className="pagina">
          <div className="topo-linha">
            <Marca />
          </div>
          <h1 className="titulo-topo">Minha conta</h1>
        </div>
      </header>
      <main className="pagina home-corpo" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <ContaCliente chaveMP={process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || ''} />
      </main>
      <Rodape />
      <NavInferior ativo="conta" />
    </>
  );
}
