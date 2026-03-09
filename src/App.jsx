/**
 * App.jsx
 * Componente raiz da aplicação. Configura roteamento e providers.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TransactionProvider } from './context/TransactionContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import History from './pages/History';

export default function App() {
  return (
    <BrowserRouter>
      <TransactionProvider>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/history" element={<History />} />
            </Routes>
          </main>
        </div>
      </TransactionProvider>
    </BrowserRouter>
  );
}
