/**
 * components/Sidebar.jsx
 * Navegação lateral da aplicação com links e indicadores visuais.
 */

import { NavLink } from 'react-router-dom';
import { LayoutDashboard, History, Plus, TrendingUp, FileUp, ListChecks, Settings, Library, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import TransactionModal from './TransactionModal';

const navItems = [
  { to: '/finance', icon: LayoutDashboard, label: 'Painel' },
  { to: '/finance/history', icon: History, label: 'Histórico' },
  { to: '/finance/imports', icon: FileUp, label: 'Importações' },
  { to: '/finance/rules', icon: ListChecks, label: 'Regras' },
  { to: '/finance/catalogs', icon: Library, label: 'Cadastros' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
];

export default function Sidebar() {
  const [modalOpen, setModalOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const mobilePrimary = navItems.slice(0, 4);
  const mobileSecondary = navItems.slice(4);

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
        <nav aria-label="Navegação financeira" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
              end={to === '/finance'}
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
      <nav aria-label="Navegação financeira móvel" style={{
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
        {mobilePrimary.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/finance'}
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
        <button className="mobile-nav-more" type="button" aria-expanded={moreOpen} aria-controls="mobile-more-menu" onClick={() => setMoreOpen((current) => !current)}><MoreHorizontal size={20} />Mais</button>
        {moreOpen && <div id="mobile-more-menu" className="mobile-more-menu">{mobileSecondary.map(({ to, icon: Icon, label }) => <NavLink key={to} to={to} onClick={() => setMoreOpen(false)}><Icon size={18} />{label}</NavLink>)}</div>}
      </nav>

      <style>{`
        @media (max-width: 900px) {
          .sidebar-desktop { display: none !important; }
          .mobile-nav { display: flex !important; }
          .mobile-nav { padding: 6px max(4px, env(safe-area-inset-right)) calc(6px + env(safe-area-inset-bottom)) max(4px, env(safe-area-inset-left)) !important; justify-content: space-between !important; }
          .mobile-nav > a, .mobile-nav > button { min-width: 0; flex: 1 1 0; padding: 7px 2px !important; justify-content: center; }
          .mobile-nav-more { display:flex; flex-direction:column; align-items:center; gap:4px; border:0; border-radius:var(--radius-sm); background:transparent; color:var(--text-muted); font-size:10px; }
          .mobile-more-menu { position:absolute; right:8px; bottom:calc(100% + 8px); min-width:180px; padding:6px; background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--radius-sm); box-shadow:var(--shadow-lg); }
          .mobile-more-menu a { display:flex; align-items:center; gap:10px; padding:11px; color:var(--text-secondary); text-decoration:none; border-radius:var(--radius-sm); }
        }
      `}</style>

      <TransactionModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
