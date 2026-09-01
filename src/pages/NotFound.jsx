import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="fatal-error">
      <div className="card fatal-error__card">
        <p className="eyebrow">Página não encontrada</p>
        <h1>Este endereço não existe</h1>
        <p>Volte ao painel financeiro para continuar.</p>
        <Link className="btn btn-primary" to="/finance">Abrir painel</Link>
      </div>
    </main>
  );
}
