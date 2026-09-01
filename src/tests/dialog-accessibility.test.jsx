import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import TransactionModal from '../components/TransactionModal';
import TransactionRow from '../components/TransactionRow';
import RulesCenter from '../pages/Finance/RulesCenter';

const mocks = vi.hoisted(() => ({ context: {}, api: {} }));

vi.mock('../context/TransactionContext', () => ({ useTransactions: () => mocks.context }));
vi.mock('../services/platform-api', () => ({ platformApi: mocks.api }));

beforeEach(() => {
  mocks.context = {
    addTransaction: vi.fn(), categories: [], accounts: [], desktop: true,
    refresh: vi.fn(), removeTransaction: vi.fn(), categorizeTransaction: vi.fn(), reconcileTransaction: vi.fn(),
  };
  mocks.api.listRules = vi.fn().mockResolvedValue([]);
  mocks.api.previewPendingRules = vi.fn().mockResolvedValue({ automatic: [], suggestions: [] });
});

describe('acessibilidade dos diálogos', () => {
  it('foca o valor, fecha com Escape e devolve foco ao gatilho', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return <><button onClick={() => setOpen(true)}>Abrir cadastro</button><TransactionModal open={open} onClose={() => setOpen(false)} /></>;
    }
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Abrir cadastro' });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: /nova transação/i });
    const value = dialog.querySelector('#transaction-value');
    await waitFor(() => expect(value).toHaveFocus());
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('cancela a confirmação de exclusão com Escape mantendo o foco', () => {
    render(<TransactionRow transaction={{ id: '1', description: 'Tarifa', type: 'expense', value: 10, date: '2026-04-01', status: 'review' }} />);
    const button = screen.getByRole('button', { name: /excluir tarifa/i });
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveFocus();
  });

  it('foca o fechar da revisão e devolve foco ao botão de análise', async () => {
    render(<RulesCenter />);
    const trigger = screen.getByRole('button', { name: /analisar pendências/i });
    fireEvent.click(trigger);
    const close = await screen.findByRole('button', { name: /fechar revisão/i });
    await waitFor(() => expect(close).toHaveFocus());
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
