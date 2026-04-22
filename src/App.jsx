/**
 * App.jsx
 * Componente raiz da aplicação. Configura roteamento e providers.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TransactionProvider } from './context/TransactionContext';
import Sidebar from './components/Sidebar';
import Landing from './pages/Landing';
import FinanceDashboard from './pages/Finance/FinanceDashboard';
import FinanceHistory from './pages/Finance/FinanceHistory';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <TransactionProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/finance" element={
            <div className="app-layout">
              <Sidebar />
              <main className="main-content">
                <FinanceDashboard />
              </main>
            </div>
          } />
          <Route path="/finance/history" element={
            <div className="app-layout">
              <Sidebar />
              <main className="main-content">
                <FinanceHistory />
              </main>
            </div>
          } />
        </Routes>
      </TransactionProvider>
    </BrowserRouter>
  );
}