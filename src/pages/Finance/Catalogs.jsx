import { useState } from 'react';
import { Landmark, Tags } from 'lucide-react';
import { useTransactions } from '../../context/TransactionContext';
import { platformApi } from '../../services/platform-api';

export default function Catalogs() {
  const { accounts, categories, refresh, desktop } = useTransactions();
  const [account, setAccount] = useState({ name: '', institution: '', externalKey: '' });
  const [category, setCategory] = useState({ name: '', type: 'expense', color: '#4d9de0' });
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('success');
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);

  const createAccount = async (event) => {
    event.preventDefault();
    if (savingAccount) return;
    setSavingAccount(true);
    setFeedback('');
    try {
      await platformApi.createAccount(account);
      setAccount({ name: '', institution: '', externalKey: '' });
      await refresh();
      setFeedbackType('success');
      setFeedback('Conta bancária criada.');
    } catch (error) {
      setFeedbackType('error');
      setFeedback(error.message || 'Não foi possível criar a conta.');
    } finally { setSavingAccount(false); }
  };

  const createCategory = async (event) => {
    event.preventDefault();
    if (savingCategory) return;
    setSavingCategory(true);
    setFeedback('');
    try {
      await platformApi.createCategory(category);
      setCategory({ name: '', type: 'expense', color: '#4d9de0' });
      await refresh();
      setFeedbackType('success');
      setFeedback('Categoria e conta contábil criadas.');
    } catch (error) {
      setFeedbackType('error');
      setFeedback(error.message || 'Não foi possível criar a categoria.');
    } finally { setSavingCategory(false); }
  };

  return (
    <section className="page-shell">
      <p className="eyebrow">Estrutura financeira</p>
      <h1>Contas e categorias</h1>
      <p className="page-lead">Cadastre contas bancárias e categorias vinculadas ao plano contábil local.</p>
      {!desktop && <div className="notice notice--warning">Abra o aplicativo desktop para alterar cadastros.</div>}
      {feedback && <div className={`notice notice--${feedbackType}`} role={feedbackType === 'error' ? 'alert' : 'status'}>{feedback}</div>}

      <div className="catalog-grid">
        <form className="card" onSubmit={createAccount}>
          <div className="section-heading"><div><p className="eyebrow">Ativos</p><h2>Nova conta bancária</h2></div><Landmark size={20} color="var(--accent-green)" /></div>
          <div className="form-field"><label htmlFor="account-name">Nome</label><input id="account-name" className="input" value={account.name} onChange={(event) => setAccount((current) => ({ ...current, name: event.target.value }))} required /></div>
          <div className="form-field"><label htmlFor="account-institution">Instituição</label><input id="account-institution" className="input" value={account.institution} onChange={(event) => setAccount((current) => ({ ...current, institution: event.target.value }))} /></div>
          <div className="form-field"><label htmlFor="account-key">Identificador externo</label><input id="account-key" className="input" value={account.externalKey} onChange={(event) => setAccount((current) => ({ ...current, externalKey: event.target.value }))} /></div>
          <button className="btn btn-primary" disabled={!desktop || savingAccount}>{savingAccount ? 'Criando conta...' : 'Criar conta'}</button>
        </form>

        <form className="card" onSubmit={createCategory}>
          <div className="section-heading"><div><p className="eyebrow">Classificação</p><h2>Nova categoria</h2></div><Tags size={20} color="var(--accent-blue)" /></div>
          <div className="form-field"><label htmlFor="category-name">Nome</label><input id="category-name" className="input" value={category.name} onChange={(event) => setCategory((current) => ({ ...current, name: event.target.value }))} required /></div>
          <div className="form-field"><label htmlFor="category-type">Tipo</label><select id="category-type" className="input" value={category.type} onChange={(event) => setCategory((current) => ({ ...current, type: event.target.value }))}><option value="expense">Despesa</option><option value="income">Receita</option></select></div>
          <div className="form-field"><label htmlFor="category-color">Cor</label><input id="category-color" className="input color-input" type="color" value={category.color} onChange={(event) => setCategory((current) => ({ ...current, color: event.target.value }))} /></div>
          <button className="btn btn-primary" disabled={!desktop || savingCategory}>{savingCategory ? 'Criando categoria...' : 'Criar categoria'}</button>
        </form>
      </div>

      <div className="catalog-grid catalog-lists">
        <div className="card data-list"><h2>Contas bancárias</h2>{accounts.filter((item) => item.subtype === 'bank').map((item) => <div className="data-row" key={item.id}><div><strong>{item.name}</strong><span>{item.code} · {item.institution || 'Sem instituição'}</span></div></div>)}</div>
        <div className="card data-list"><h2>Categorias</h2>{categories.map((item) => <div className="data-row" key={item.id}><div><strong>{item.name}</strong><span>{item.type === 'income' ? 'Receita' : 'Despesa'}</span></div><span className="color-dot" style={{ background: item.color }} /></div>)}</div>
      </div>
    </section>
  );
}
