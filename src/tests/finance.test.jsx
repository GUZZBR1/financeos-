import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FinanceDashboard from '../pages/Finance/FinanceDashboard';

const mockTransactions = [
  { id: '1', type: 'income', value: 5000, description: 'Venda', category: 'Receitas', date: '2026-04-01' },
  { id: '2', type: 'expense', value: 1200, description: 'Marketing', category: 'Fornecedores e serviços', date: '2026-04-05' },
  { id: '3', type: 'expense', value: 800, description: 'Aluguel', category: 'Fornecedores e serviços', date: '2026-04-10' },
];

vi.mock('../context/TransactionContext', () => ({
  useTransactions: () => ({ transactions: mockTransactions, loading: false }),
}));

const renderWithRouter = (ui) => render(<BrowserRouter>{ui}</BrowserRouter>);

describe('Painel financeiro', () => {
  it('exibe o título principal', () => {
    renderWithRouter(<FinanceDashboard />);
    expect(screen.getByText(/Painel financeiro/i)).toBeInTheDocument();
  });

  it('exibe o resumo de saldo', () => {
    renderWithRouter(<FinanceDashboard />);
    expect(screen.getByText(/Saldo bancário/i)).toBeInTheDocument();
  });

  it('exibe o filtro de período', () => {
    renderWithRouter(<FinanceDashboard />);
    expect(screen.getByText(/Últimos 30 dias/i)).toBeInTheDocument();
  });

  it('oferece os modos Chat e Work no assistente financeiro', () => {
    renderWithRouter(<FinanceDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /abrir chat financeiro/i }));
    expect(screen.getByRole('tab', { name: 'Chat' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Work' })).toHaveAttribute('aria-selected', 'false');
  });
});
