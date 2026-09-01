import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Erro não tratado no FinanceOS:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="fatal-error" role="alert">
        <div className="card fatal-error__card">
          <p className="eyebrow">Erro inesperado</p>
          <h1>Não foi possível abrir esta tela</h1>
          <p>{this.state.error.message || 'O aplicativo encontrou um erro desconhecido.'}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Recarregar aplicativo
          </button>
        </div>
      </main>
    );
  }
}
