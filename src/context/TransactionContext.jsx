/**
 * context/TransactionContext.jsx
 * Estado global da aplicação via React Context.
 * Transações agora vêm do Supabase para usuários autenticados.
 * localStorage foi removido da camada de transações.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  getTransactions,
  createTransaction as svcCreateTransaction,
  deleteTransaction as svcDeleteTransaction,
} from '../services/transactionService';

const TransactionContext = createContext(null);

export const TransactionProvider = ({ children }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load transactions when user authenticates; clear when they log out
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getTransactions(user.id);
        if (!cancelled) {
          setTransactions(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setTransactions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => { cancelled = true; };
  }, [user?.id]);

  /**
   * Adiciona uma nova transação no Supabase e atualiza o estado local.
   * Só executa para usuários autenticados.
   */
  const addTransaction = useCallback(
    async (transaction) => {
      if (!user) return null;
      const saved = await svcCreateTransaction(user.id, transaction);
      setTransactions((prev) =>
        [saved, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date))
      );
      return saved;
    },
    [user]
  );

  /**
   * Remove uma transação do Supabase e atualiza o estado local.
   * Só executa para usuários autenticados.
   */
  const removeTransaction = useCallback(
    async (id) => {
      if (!user) return;
      await svcDeleteTransaction(user.id, id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    },
    [user]
  );

  return (
    <TransactionContext.Provider value={{ transactions, addTransaction, removeTransaction, loading, error }}>
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