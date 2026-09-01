import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PeriodFilter from '../components/PeriodFilter';
import ButtonRippleEffect from '../components/ButtonRippleEffect';
import { PERIOD_FILTERS } from '../services/calculations';

vi.mock('../context/TransactionContext', () => ({
  useTransactions: () => ({ addTransaction: vi.fn(), categories: [], accounts: [] }),
}));

describe('navegação móvel', () => {
  it('expõe navegação semântica e menu secundário', () => {
    render(<MemoryRouter><Sidebar /></MemoryRouter>);
    const mobileNavigation = document.querySelector('nav.mobile-nav');
    expect(mobileNavigation).toHaveAttribute('aria-label', 'Navegação financeira móvel');
    const more = mobileNavigation.querySelector('.mobile-nav-more');
    expect(more).toHaveTextContent('Mais');
    expect(more).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(mobileNavigation.querySelector('a[href="/finance/catalogs"]')).toHaveTextContent('Cadastros');
    expect(mobileNavigation.querySelector('a[href="/settings"]')).toHaveTextContent('Configurações');
  });
});

describe('filtro de período', () => {
  it('comunica o período selecionado e associa os rótulos customizados', () => {
    const onChange = vi.fn();
    render(<PeriodFilter value={PERIOD_FILTERS.CUSTOM} onChange={onChange} customStart="" customEnd="" onCustomChange={vi.fn()} includeAll />);
    const custom = screen.getByRole('button', { name: /personalizado/i });
    expect(custom).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('group', { name: /períodos disponíveis/i })).toBeInTheDocument();
    expect(screen.getByLabelText('De')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('até')).toHaveAttribute('type', 'date');
    fireEvent.click(screen.getByRole('button', { name: /hoje/i }));
    expect(onChange).toHaveBeenCalledWith(PERIOD_FILTERS.TODAY);
  });
});

describe('ripple declarativo', () => {
  it('renderiza o efeito em portal sem adicionar filhos ao botão', () => {
    render(<><ButtonRippleEffect /><button>Executar</button></>);
    const button = screen.getByRole('button', { name: 'Executar' });
    fireEvent.pointerDown(button, { clientX: 5, clientY: 5 });
    expect(button.children).toHaveLength(0);
    expect(document.body.querySelector('.button-ripple')).toBeInTheDocument();
  });
});
