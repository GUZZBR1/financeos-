/**
 * components/Sidebar.jsx
 * Navegação lateral da aplicação com links e indicadores visuais.
 */

import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, History, Plus, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import TransactionModal from './TransactionModal';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/history', icon: History, label: 'Histórico' },
];

export default function Sidebar() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 240,
        height: '100vh',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        zIndex: 100,
      }}
        className="sidebar-desktop"
      >
        {/* Logo */}
        <div style={{ marginBottom: 40, paddingLeft: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32,
              background: 'linear-gradient(135deg, var(--accent-green), var(--accent-blue))',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TrendingUp size={16} color="#0a0b0f" strokeWidth={2.5} />
            </div>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 18,
              letterSpacing: '-0.5px',
              color: 'var(--text-primary)',
            }}>
              Finance<span style={{ color: 'var(--accent-green)' }}>OS</span>
            </span>
          </div>
        </div>

        {/* Nova Transação CTA */}
        <button
          onClick={() => setModalOpen(true)}
          className="btn btn-primary"
          style={{ width: '100%', marginBottom: 32, justifyContent: 'center' }}
        >
          <Plus size={16} />
          Nova Transação
        </button>

        {/* Nav links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            padding: '0 12px',
            marginBottom: 8,
          }}>
            Menu
          </p>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: 14,
                color: isActive ? 'var(--accent-green)' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-green-dim)' : 'transparent',
                border: isActive ? '1px solid var(--border-accent)' : '1px solid transparent',
                transition: 'all var(--transition)',
              })}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ marginTop: 'auto', padding: '12px', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            FinanceOS v1.0
          </p>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <div style={{
        display: 'none',
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
        padding: '8px 16px',
        zIndex: 100,
        justifyContent: 'space-around',
        alignItems: 'center',
      }} className="mobile-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              fontSize: 10,
              fontWeight: 500,
              color: isActive ? 'var(--accent-green)' : 'var(--text-muted)',
            })}
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
        <button
          onClick={() => setModalOpen(true)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '8px 16px',
            background: 'var(--accent-green)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            color: '#0a0b0f',
            fontSize: 10,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Plus size={20} />
          Novo
        </button>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .sidebar-desktop { display: none !important; }
          .mobile-nav { display: flex !important; }
        }
      `}</style>

      <TransactionModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
