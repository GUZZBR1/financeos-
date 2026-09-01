/**
 * context/TransactionContext.jsx
 * Estado global da aplicação via React Context.
 * Centraliza todas as operações de transação e re-renderização automática.
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { platformApi } from '../services/platform-api';

const TransactionContext = createContext(null);

export const TransactionProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const refreshIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const refreshId = ++refreshIdRef.current;
    if (!mountedRef.current) return { ok: false, errors: [] };
    setLoading(true);
    setError(null);
    const results = await Promise.allSettled([
      platformApi.listTransactions(),
      platformApi.listCategories(),
      platformApi.listAccounts(),
    ]);
    if (!mountedRef.current || refreshId !== refreshIdRef.current) return { ok: false, errors: [] };

    const [transactionResult, categoryResult, accountResult] = results;
    if (transactionResult.status === 'fulfilled') setTransactions([...transactionResult.value].sort((a, b) => new Date(b.date) - new Date(a.date)));
    if (categoryResult.status === 'fulfilled') setCategories(categoryResult.value);
    if (accountResult.status === 'fulfilled') setAccounts(accountResult.value);

    const labels = ['movimentações', 'categorias', 'contas'];
    const errors = results.flatMap((result, index) => result.status === 'rejected'
      ? [`${labels[index]}: ${result.reason?.message || 'falha desconhecida'}`]
      : []);
    if (errors.length) setError(`Alguns dados não puderam ser carregados (${errors.join('; ')}).`);
    setLoading(false);
    return { ok: errors.length === 0, errors };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => {
      mountedRef.current = false;
      refreshIdRef.current += 1;
    };
  }, [refresh]);

  /**
   * Adiciona uma nova transação e re-sincroniza o estado
   */
  const addTransaction = useCallback(async (transaction) => {
    const saved = await platformApi.createTransaction(transaction);
    if (mountedRef.current) setTransactions((prev) =>
      [saved, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date))
    );
    return saved;
  }, []);

  /**
   * Remove uma transação pelo ID
   */
  const removeTransaction = useCallback(async (id) => {
    await platformApi.deleteTransaction(id);
    if (mountedRef.current) setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const categorizeTransaction = useCallback(async (id, categoryId, learn = false) => {
    const updated = await platformApi.categorizeTransaction(id, categoryId, learn);
    if (mountedRef.current) setTransactions((previous) => previous.map((transaction) => transaction.id === id ? updated : transaction));
    return updated;
  }, []);

  const reconcileTransaction = useCallback(async (id) => {
    const updated = await platformApi.reconcileTransaction(id);
    if (mountedRef.current) setTransactions((previous) => previous.map((transaction) => transaction.id === id ? updated : transaction));
    return updated;
  }, []);

  return (
    <TransactionContext.Provider value={{
      transactions,
      categories,
      accounts,
      addTransaction,
      removeTransaction,
      categorizeTransaction,
      reconcileTransaction,
      refresh,
      loading,
      error,
      desktop: platformApi.isDesktop(),
    }}>
      {children}
    </TransactionContext.Provider>
  );
};

/**
 * Hook customizado para consumir o contexto
 */
export const useTransactions = () => {
  const ctx = useContext(TransactionContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionProvider');
  return ctx;
};
