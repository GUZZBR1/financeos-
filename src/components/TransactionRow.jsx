/**
 * components/TransactionRow.jsx
 * Linha individual de transação para uso no histórico e dashboard.
 */

import { Trash2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { formatCurrency, formatDisplayDate } from '../services/calculations';
import { useTransactions } from '../context/TransactionContext';
import { useState } from 'react';

export default function TransactionRow({ transaction, compact = false }) {
  const { removeTransaction } = useTransactions();
  const [confirming, setConfirming] = useState(false);
  const isIncome = transaction.type === 'income';

  const handleDelete = () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    } else {
      removeTransaction(transaction.id);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: compact ? '12px 0' : '14px 0',
      borderBottom: '1px solid var(--border)',
      transition: 'background var(--transition)',
    }}>
      {/* Icon */}
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 'var(--radius-sm)',
        background: isIncome ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {isIncome
          ? <ArrowDownLeft size={16} color="var(--accent-green)" />
          : <ArrowUpRight size={16} color="var(--accent-red)" />
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {transaction.description || (isIncome ? 'Recebimento' : 'Gasto')}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
          {formatDisplayDate(transaction.date)} · {isIncome ? 'Entrada' : 'Saída'}
        </p>
      </div>

      {/* Value */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontWeight: 500,
        fontSize: 15,
        color: isIncome ? 'var(--accent-green)' : 'var(--accent-red)',
        flexShrink: 0,
      }}>
        {isIncome ? '+' : '−'} {formatCurrency(transaction.value)}
      </div>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        title={confirming ? 'Clique novamente para confirmar' : 'Excluir'}
        style={{
          background: confirming ? 'var(--accent-red-dim)' : 'transparent',
          border: `1px solid ${confirming ? 'rgba(255,95,107,0.3)' : 'transparent'}`,
          borderRadius: 'var(--radius-sm)',
          color: confirming ? 'var(--accent-red)' : 'var(--text-muted)',
          cursor: 'pointer',
          padding: '6px',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          transition: 'all var(--transition)',
        }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
