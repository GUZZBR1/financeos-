/**
 * components/TransactionModal.jsx
 * Modal para registro de novas transações financeiras.
 */

import { useState, useEffect, useRef } from 'react';
import { X, ArrowDownCircle, ArrowUpCircle, DollarSign, FileText, Calendar } from 'lucide-react';
import { useTransactions } from '../context/TransactionContext';
import { format } from 'date-fns';

const defaultForm = () => ({
  value: '',
  type: 'income',
  description: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  categoryId: '',
  accountId: '',
});

export default function TransactionModal({ open, onClose }) {
  const { addTransaction, categories, accounts } = useTransactions();
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef(null);
  const valueInputRef = useRef(null);
  const returnFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open) {
      setForm(defaultForm());
      setSuccess(false);
      setError('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement;
    const frame = requestAnimationFrame(() => valueInputRef.current?.focus());
    const handler = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...dialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handler);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handler);
      returnFocusRef.current?.focus?.();
    };
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.value || parseFloat(form.value) <= 0) return;

    setSaving(true);
    setError('');
    try {
      await addTransaction({
        value: parseFloat(form.value),
        type: form.type,
        description: form.description,
        date: form.date,
        categoryId: form.categoryId || null,
        accountId: form.accountId || null,
      });
      setSuccess(true);
      setTimeout(() => onClose(), 900);
    } catch (saveError) {
      setError(saveError.message || 'Não foi possível registrar a transação.');
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  if (!open) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        ref={dialogRef}
        className="card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-modal-title"
        style={{
          width: '100%',
          maxWidth: 460,
          padding: 0,
          overflow: 'hidden',
          animation: 'fadeUp 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 id="transaction-modal-title" style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.3px' }}>
            Nova Transação
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar cadastro de transação"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Tipo */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
              Tipo de Transação
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { value: 'income', label: 'Recebimento', icon: ArrowDownCircle, color: 'var(--accent-green)', dim: 'var(--accent-green-dim)' },
                { value: 'expense', label: 'Gasto', icon: ArrowUpCircle, color: 'var(--accent-red)', dim: 'var(--accent-red-dim)' },
              ].map(({ value, label, icon: Icon, color, dim }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: value }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: `1.5px solid ${form.type === value ? color : 'var(--border)'}`,
                    background: form.type === value ? dim : 'var(--bg-elevated)',
                    color: form.type === value ? color : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: 14,
                    transition: 'all var(--transition)',
                  }}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Valor */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Valor (R$)
            </label>
            <div style={{ position: 'relative' }}>
              <DollarSign size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                ref={valueInputRef}
                id="transaction-value"
                type="number"
                min="0.01"
                step="0.01"
                value={form.value}
                onChange={set('value')}
                placeholder="0,00"
                required
                className="input"
                style={{ paddingLeft: 38, fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 500 }}
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Descrição <span style={{ color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <FileText size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={form.description}
                onChange={set('description')}
                placeholder="Ex: Pagamento cliente, Assinatura..."
                className="input"
                style={{ paddingLeft: 38 }}
                maxLength={80}
              />
            </div>
          </div>

          {/* Data */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Data
            </label>
            <div style={{ position: 'relative' }}>
              <Calendar size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="date"
                value={form.date}
                onChange={set('date')}
                required
                className="input"
                style={{ paddingLeft: 38, colorScheme: 'dark', fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label htmlFor="transaction-category" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                Categoria
              </label>
              <select
                id="transaction-category"
                value={form.categoryId}
                onChange={set('categoryId')}
                className="input"
              >
                <option value="">Classificar depois</option>
                {categories.filter((category) => category.type === form.type || category.type === 'both').map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="transaction-account" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                Conta
              </label>
              <select
                id="transaction-account"
                value={form.accountId}
                onChange={set('accountId')}
                className="input"
              >
                <option value="">Conta principal</option>
                {accounts.filter((account) => account.subtype === 'bank').map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit */}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button
            type="submit"
            disabled={saving || success}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, marginTop: 4 }}
          >
            {success ? '✓ Salvo com sucesso!' : saving ? 'Salvando...' : 'Registrar Transação'}
          </button>
        </form>
      </div>
    </div>
  );
}
