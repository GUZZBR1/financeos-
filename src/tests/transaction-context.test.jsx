import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TransactionProvider, useTransactions } from '../context/TransactionContext';

const api = vi.hoisted(() => ({
  listTransactions: vi.fn(),
  listCategories: vi.fn(),
  listAccounts: vi.fn(),
  isDesktop: vi.fn(() => true),
}));

vi.mock('../services/platform-api', () => ({ platformApi: api }));

function Probe() {
  const { transactions, categories, accounts, loading, error, refresh } = useTransactions();
  return <div>
    <span data-testid="transactions">{transactions.map((item) => item.description).join(',')}</span>
    <span data-testid="categories">{categories.map((item) => item.name).join(',')}</span>
    <span data-testid="accounts">{accounts.map((item) => item.name).join(',')}</span>
    <span data-testid="loading">{String(loading)}</span>
    {error && <span role="alert">{error}</span>}
    <button onClick={refresh}>Atualizar</button>
  </div>;
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listTransactions.mockResolvedValue([{ id: '1', description: 'Venda', date: '2026-04-01' }]);
  api.listCategories.mockResolvedValue([{ id: 'c1', name: 'Receitas' }]);
  api.listAccounts.mockResolvedValue([{ id: 'a1', name: 'Conta principal' }]);
});

describe('TransactionProvider resiliente', () => {
  it('mantém os recursos carregados quando outro recurso falha', async () => {
    api.listCategories.mockRejectedValue(new Error('categorias indisponíveis'));
    render(<TransactionProvider><Probe /></TransactionProvider>);

    expect(await screen.findByText(/categorias indisponíveis/i)).toBeInTheDocument();
    expect(screen.getByTestId('transactions')).toHaveTextContent('Venda');
    expect(screen.getByTestId('accounts')).toHaveTextContent('Conta principal');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('preserva dados anteriores durante refresh que falha e recupera depois', async () => {
    render(<TransactionProvider><Probe /></TransactionProvider>);
    await waitFor(() => expect(screen.getByTestId('transactions')).toHaveTextContent('Venda'));

    api.listTransactions.mockRejectedValueOnce(new Error('banco temporariamente indisponível'));
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    expect(await screen.findByText(/banco temporariamente indisponível/i)).toBeInTheDocument();
    expect(screen.getByTestId('transactions')).toHaveTextContent('Venda');

    api.listTransactions.mockResolvedValueOnce([{ id: '2', description: 'Recebimento', date: '2026-05-01' }]);
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByTestId('transactions')).toHaveTextContent('Recebimento');
  });

  it('ignora a conclusão de uma carga depois do unmount', async () => {
    let resolveTransactions;
    api.listTransactions.mockReturnValue(new Promise((resolve) => { resolveTransactions = resolve; }));
    const view = render(<TransactionProvider><Probe /></TransactionProvider>);
    view.unmount();
    resolveTransactions([{ id: 'late', description: 'Resposta tardia', date: '2026-06-01' }]);
    await Promise.resolve();
    expect(screen.queryByText('Resposta tardia')).not.toBeInTheDocument();
  });
});
