/**
 * components/TransactionRow.jsx
 * Linha individual de transação para uso no histórico e dashboard.
 */

import { Trash2, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDisplayDate } from '../services/calculations';
import { useTransactions } from '../context/TransactionContext';
import { useEffect, useRef, useState } from 'react';

export default function TransactionRow({ transaction, compact = false }) {
  const { removeTransaction, categorizeTransaction, reconcileTransaction, categories } = useTransactions();
  const [confirming, setConfirming] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [operationError, setOperationError] = useState('');
  const confirmationTimer = useRef(null);
  const deleteButtonRef = useRef(null);
  const isIncome = transaction.type === 'income';

  useEffect(() => () => clearTimeout(confirmationTimer.current), []);
  useEffect(() => {
    if (!confirming) return undefined;
    const cancelConfirmation = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      clearTimeout(confirmationTimer.current);
      setConfirming(false);
      deleteButtonRef.current?.focus();
    };
    document.addEventListener('keydown', cancelConfirmation);
    return () => document.removeEventListener('keydown', cancelConfirmation);
  }, [confirming]);

  const handleDelete = async () => {
    if (deleting) return;
    if (!confirming) {
      setConfirming(true);
      clearTimeout(confirmationTimer.current);
      confirmationTimer.current = setTimeout(() => setConfirming(false), 3000);
      return;
    }
    clearTimeout(confirmationTimer.current);
    setDeleting(true);
    setOperationError('');
    try {
      await removeTransaction(transaction.id);
    } catch (error) {
      setConfirming(false);
      setOperationError(error.message || 'Não foi possível excluir esta transação.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCategory = async (event) => {
    const categoryId = event.target.value;
    if (!categoryId) return;
    if (categorizing) return;
    setCategorizing(true);
    setOperationError('');
    try {
      await categorizeTransaction(transaction.id, categoryId, true);
    } catch (error) {
      setOperationError(error.message || 'Não foi possível classificar esta transação.');
    } finally {
      setCategorizing(false);
    }
  };

  const handleReconcile = async () => {
    if (reconciling) return;
    setReconciling(true);
    setOperationError('');
    try {
      await reconcileTransaction(transaction.id);
    } catch (error) {
      setOperationError(error.message || 'Não foi possível conciliar esta transação.');
    } finally {
      setReconciling(false);
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
          {formatDisplayDate(transaction.date)} · {isIncome ? 'Crédito' : 'Débito'} · {transaction.category || 'Categoria pendente'}
        </p>
        {!compact && transaction.status === 'review' && (
          <select className="inline-category" aria-label={`Classificar ${transaction.description}`} defaultValue="" onChange={handleCategory} disabled={categorizing}>
            <option value="">{categorizing ? 'Classificando...' : 'Escolher categoria e aprender regra'}</option>
            {categories.filter((category) => category.type === transaction.type || category.type === 'both').map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        )}
        {operationError && <p className="form-error" role="alert">{operationError}</p>}
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
      {!compact && transaction.status === 'categorized' && (
        <button className="icon-button" onClick={handleReconcile} disabled={reconciling || deleting} aria-label={reconciling ? `Conciliando ${transaction.description}` : `Conciliar ${transaction.description}`} title="Marcar como conciliada">
          <CheckCircle2 size={14} />
        </button>
      )}
      <button
        ref={deleteButtonRef}
        onClick={handleDelete}
        disabled={deleting || reconciling}
        aria-pressed={confirming}
        aria-describedby={confirming ? `delete-confirmation-${transaction.id}` : undefined}
        aria-label={confirming ? `Confirmar exclusão de ${transaction.description}` : `Excluir ${transaction.description}`}
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
      {confirming && <span id={`delete-confirmation-${transaction.id}`} role="status" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>Clique novamente para confirmar a exclusão ou pressione Escape para cancelar.</span>}
    </div>
  );
}
