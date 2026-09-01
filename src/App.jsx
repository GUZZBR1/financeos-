/**
 * App.jsx
 * Componente raiz da aplicação. Configura roteamento e providers.
 */

import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { TransactionProvider, useTransactions } from './context/TransactionContext';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import ButtonRippleEffect from './components/ButtonRippleEffect';

const Landing = lazy(() => import('./pages/Landing'));
const FinanceDashboard = lazy(() => import('./pages/Finance/FinanceDashboard'));
const FinanceHistory = lazy(() => import('./pages/Finance/FinanceHistory'));
const ImportCenter = lazy(() => import('./pages/Finance/ImportCenter'));
const RulesCenter = lazy(() => import('./pages/Finance/RulesCenter'));
const Catalogs = lazy(() => import('./pages/Finance/Catalogs'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

const FinanceLayout = ({ children }) => {
  const { error, loading, refresh, transactions, categories, accounts } = useTransactions();
  const hasData = transactions.length > 0 || categories.length > 0 || accounts.length > 0;
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {error && <div className="notice notice--error global-data-status" role="alert"><span>{error} Os dados disponíveis foram preservados.</span><button className="btn btn-ghost" type="button" onClick={refresh} disabled={loading}>{loading ? 'Tentando novamente...' : 'Tentar novamente'}</button></div>}
        {loading && hasData && !error && <div className="notice global-data-status" role="status">Atualizando dados financeiros...</div>}
        {children}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ButtonRippleEffect />
      <HashRouter>
        <TransactionProvider>
          <Suspense fallback={<main className="route-loading">Carregando...</main>}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/finance" element={<FinanceLayout><FinanceDashboard /></FinanceLayout>} />
              <Route path="/finance/history" element={<FinanceLayout><FinanceHistory /></FinanceLayout>} />
              <Route path="/finance/imports" element={<FinanceLayout><ImportCenter /></FinanceLayout>} />
              <Route path="/finance/rules" element={<FinanceLayout><RulesCenter /></FinanceLayout>} />
              <Route path="/finance/catalogs" element={<FinanceLayout><Catalogs /></FinanceLayout>} />
              <Route path="/settings" element={<FinanceLayout><Settings /></FinanceLayout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </TransactionProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
