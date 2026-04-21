import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FinanceDashboard from '../pages/Finance/FinanceDashboard';

// Mock localStorage
const localStorageMock = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};
global.localStorage = localStorageMock;

// Mock transaction context
const mockTransactions = [
  { id: '1', type: 'income', value: 5000, description: 'Sales Revenue', date: '2026-04-01' },
  { id: '2', type: 'expense', value: 1200, description: 'Marketing Expenses', date: '2026-04-05' },
  { id: '3', type: 'expense', value: 800, description: 'Rent Office', date: '2026-04-10' },
];

vi.mock('../context/TransactionContext', () => ({
  useTransactions: () => ({
    transactions: mockTransactions,
    loading: false,
  }),
}));

const renderWithRouter = (ui) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('FinanceDashboard smoke test', () => {
  it('renders the Finance Department heading', () => {
    renderWithRouter(<FinanceDashboard />);
    expect(screen.getByText(/Finance Department/i)).toBeInTheDocument();
  });

  it('renders summary cards', () => {
    renderWithRouter(<FinanceDashboard />);
    expect(screen.getByText(/Balance/i)).toBeInTheDocument();
  });

  it('renders period filter', () => {
    renderWithRouter(<FinanceDashboard />);
    expect(screen.getByText(/Últimos 30 dias/i)).toBeInTheDocument();
  });
});
