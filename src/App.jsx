/**
 * App.jsx
 * Componente raiz da aplicação. Configura roteamento e providers.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TransactionProvider } from './context/TransactionContext';
import Sidebar from './components/Sidebar';
import FinanceDashboard from './pages/Finance/FinanceDashboard';
import FinanceHistory from './pages/Finance/FinanceHistory';

export default function App() {
  return (
    <BrowserRouter>
      <TransactionProvider>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/finance" element={<FinanceDashboard />} />
              <Route path="/finance/history" element={<FinanceHistory />} />
            </Routes>
          </main>
        </div>
      </TransactionProvider>
    </BrowserRouter>
  );
}
