import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import FinanceHistory from '../pages/Finance/FinanceHistory';
import ImportCenter from '../pages/Finance/ImportCenter';
import RulesCenter from '../pages/Finance/RulesCenter';
import TransactionRow from '../components/TransactionRow';

const mocks = vi.hoisted(() => ({
  context: {},
  api: {
    listImportBatches: vi.fn(),
    selectOfx: vi.fn(),
    commitOfx: vi.fn(),
    listRules: vi.fn(),
    createRule: vi.fn(),
    deleteRule: vi.fn(),
  },
}));

vi.mock('../context/TransactionContext', () => ({
  useTransactions: () => mocks.context,
}));

vi.mock('../services/platform-api', () => ({
  platformApi: mocks.api,
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.context = {
    transactions: [],
    categories: [],
    accounts: [],
    loading: false,
    desktop: true,
    refresh: vi.fn().mockResolvedValue(undefined),
    removeTransaction: vi.fn().mockResolvedValue(undefined),
    categorizeTransaction: vi.fn().mockResolvedValue(undefined),
    reconcileTransaction: vi.fn().mockResolvedValue(undefined),
  };
  mocks.api.listImportBatches.mockResolvedValue([]);
  mocks.api.listRules.mockResolvedValue([]);
});

describe('correções P1 do frontend', () => {
  it('oferece categorias de receita quando o histórico filtra receitas', async () => {
    mocks.context.categories = [
      { id: 'income', name: 'Receitas', type: 'income' },
      { id: 'expense', name: 'Fornecedores', type: 'expense' },
    ];

    render(<MemoryRouter initialEntries={['/finance/history?type=income&period=all']}><FinanceHistory /></MemoryRouter>);

    expect(await screen.findByRole('option', { name: 'Receitas' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Fornecedores' })).not.toBeInTheDocument();
  });

  it('não redireciona ao confirmar arquivo já importado', async () => {
    mocks.api.selectOfx.mockResolvedValue({
      canceled: false,
      token: 'preview-token',
      fileName: 'extrato.ofx',
      total: 1,
      account: { accountId: 'conta-1' },
      sample: [{ date: '2026-04-01', description: 'Venda', type: 'income', value: 100 }],
    });
    mocks.api.commitOfx.mockResolvedValue({ alreadyImported: true, batchId: 'lote-antigo' });

    render(
      <MemoryRouter initialEntries={['/finance/imports']}>
        <Routes><Route path="*" element={<><ImportCenter /><LocationProbe /></>} /></Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /selecionar ofx/i }));
    fireEvent.click(await screen.findByRole('button', { name: /confirmar importa/i }));

    expect(await screen.findByText(/já havia sido importado/i)).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/finance/imports');
  });

  it('exibe falha de exclusão de transação e bloqueia clique durante a operação', async () => {
    let rejectDelete;
    mocks.context.removeTransaction = vi.fn(() => new Promise((_, reject) => { rejectDelete = reject; }));
    const transaction = { id: '1', type: 'expense', value: 10, description: 'Tarifa', date: '2026-04-01', status: 'review' };

    render(<TransactionRow transaction={transaction} />);
    fireEvent.click(screen.getByRole('button', { name: /excluir tarifa/i }));
    const confirm = screen.getByRole('button', { name: /confirmar.*tarifa/i });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(mocks.context.removeTransaction).toHaveBeenCalledTimes(1);
    rejectDelete(new Error('Falha ao excluir'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao excluir');
  });

  it('mostra erro quando regras não podem ser carregadas', async () => {
    mocks.api.listRules.mockRejectedValue(new Error('Banco indisponível'));
    render(<RulesCenter />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Banco indisponível');
    await waitFor(() => expect(screen.queryByText(/carregando regras/i)).not.toBeInTheDocument());
  });
});
