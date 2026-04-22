/**
 * App.jsx
 * Componente raiz da aplicação. Configura roteamento e providers.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TransactionProvider } from './context/TransactionContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import FinanceDashboard from './pages/Finance/FinanceDashboard';
import FinanceHistory from './pages/Finance/FinanceHistory';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <TransactionProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/finance"
              element={
                <ProtectedRoute>
                  <div className="app-layout">
                    <Sidebar />
                    <main className="main-content">
                      <FinanceDashboard />
                    </main>
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/history"
              element={
                <ProtectedRoute>
                  <div className="app-layout">
                    <Sidebar />
                    <main className="main-content">
                      <FinanceHistory />
                    </main>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </TransactionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}