import ListaPedidos from '../../components/ListaPedidos';
import Marca from '../../components/Marca';
import NavInferior from '../../components/NavInferior';
import Rodape from '../../components/Rodape';

export const metadata = { title: 'Meus pedidos', robots: { index: false, follow: false } };

export default function MeusPedidos() {
  return (
    <>
      <header className="topo-app">
        <div className="pagina">
          <div className="topo-linha">
            <Marca />
          </div>
          <h1 className="titulo-topo">Meus pedidos</h1>
        </div>
      </header>
      <main className="pagina home-corpo">
        <ListaPedidos />
      </main>
      <Rodape />
      <NavInferior ativo="pedidos" />
    </>
  );
}
