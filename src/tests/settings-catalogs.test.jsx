import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Settings from '../pages/Settings';
import Catalogs from '../pages/Finance/Catalogs';

const mocks = vi.hoisted(() => ({ api: {}, context: {} }));
vi.mock('../services/platform-api', () => ({ platformApi: mocks.api }));
vi.mock('../context/TransactionContext', () => ({ useTransactions: () => mocks.context }));

beforeEach(() => {
  Object.keys(mocks.api).forEach((key) => delete mocks.api[key]);
  Object.assign(mocks.api, {
    getAppInfo: vi.fn().mockResolvedValue({ desktop: true, dataPath: 'dados' }),
    listAccounts: vi.fn().mockResolvedValue([]),
    getAiConfig: vi.fn().mockResolvedValue({ configured: true, hasApiKey: true, apiKey: 'segredo-da-api', baseUrl: 'https://api.test/v1', model: 'modelo' }),
    listConnectors: vi.fn().mockResolvedValue([{ id: 'q1', type: 'questor-syn', token: 'segredo-questor', config: {} }, { id: 'l1', type: 'local-api', token: 'segredo-local', config: {} }]),
    listConnectorMappings: vi.fn().mockResolvedValue([]),
    saveAiConfig: vi.fn(),
    createAccount: vi.fn(),
    createCategory: vi.fn(),
  });
  mocks.context = { accounts: [], categories: [], desktop: true, refresh: vi.fn().mockResolvedValue({ ok: true }) };
});

describe('Configurações seguras e resilientes', () => {
  it('nunca repovoa campos secretos retornados pela API', async () => {
    render(<Settings />);
    await waitFor(() => expect(screen.getByLabelText(/chave da api/i)).toHaveValue(''));
    expect(screen.getByLabelText(/^token$/i)).toHaveValue('');
    expect(screen.getByLabelText(/token de acesso/i)).toHaveValue('');
  });

  it('bloqueia salvamento repetido e limpa a chave após sucesso', async () => {
    let resolveSave;
    mocks.api.saveAiConfig.mockReturnValue(new Promise((resolve) => { resolveSave = resolve; }));
    render(<Settings />);
    const key = await screen.findByLabelText(/chave da api/i);
    fireEvent.change(key, { target: { value: 'nova-chave' } });
    const save = screen.getByRole('button', { name: /salvar ia/i });
    fireEvent.click(save);
    fireEvent.click(save);
    expect(mocks.api.saveAiConfig).toHaveBeenCalledTimes(1);
    resolveSave({ configured: true, hasApiKey: true, apiKey: 'não-deve-aparecer' });
    await waitFor(() => expect(key).toHaveValue(''));
    expect(await screen.findByRole('status')).toHaveTextContent(/salva com segurança/i);
  });

  it('exibe falha parcial de carregamento como erro', async () => {
    mocks.api.listAccounts.mockRejectedValue(new Error('falha nas contas'));
    render(<Settings />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/não puderam ser carregadas/i);
  });
});

describe('Cadastros', () => {
  it('bloqueia criação repetida e mostra erro tipado', async () => {
    mocks.api.createAccount.mockRejectedValue(new Error('Conta duplicada'));
    render(<Catalogs />);
    fireEvent.change(screen.getByLabelText(/^nome$/i, { selector: '#account-name' }), { target: { value: 'Banco' } });
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Conta duplicada');
    expect(mocks.api.createAccount).toHaveBeenCalledTimes(1);
  });
});
