/**
 * context/TransactionContext.jsx
 * Estado global da aplicação via React Context.
 * Centraliza todas as operações de transação e re-renderização automática.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getAllTransactions,
  saveTransaction,
  deleteTransaction,
  seedDemoData,
} from '../services/database';

const TransactionContext = createContext(null);

export const TransactionProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carrega dados iniciais
  useEffect(() => {
    seedDemoData(); // Popula com dados de demo na primeira vez
    const data = getAllTransactions();
    // Ordena por data desc
    setTransactions(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    setLoading(false);
  }, []);

  /**
   * Adiciona uma nova transação e re-sincroniza o estado
   */
  const addTransaction = useCallback((transaction) => {
    const saved = saveTransaction(transaction);
    setTransactions((prev) =>
      [saved, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date))
    );
    return saved;
  }, []);

  /**
   * Remove uma transação pelo ID
   */
  const removeTransaction = useCallback((id) => {
    deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <TransactionContext.Provider value={{ transactions, addTransaction, removeTransaction, loading }}>
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
