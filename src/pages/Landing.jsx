/**
 * pages/Landing.jsx
 * High-level landing page for FinanceOS — SaaS style, minimal.
 */

import { useNavigate } from 'react-router-dom';

const features = [
  {
    emoji: '📊',
    title: 'Smart Dashboard',
    desc: 'Real-time overview with AI-generated insights — not just numbers.',
  },
  {
    emoji: '🚨',
    title: 'Finance Signals',
    desc: 'Automatic detection of expenses spikes, revenue decline, and risk patterns.',
  },
  {
    emoji: '⚡',
    title: 'Actionable Interface',
    desc: 'Act directly on insights — simulate savings, filter categories, open history.',
  },
  {
    emoji: '📁',
    title: 'Contextual History',
    desc: 'URL-based filters with shareable views. Navigate contextually from any signal.',
  },
  {
    emoji: '🔖',
    title: 'Saved Views',
    desc: 'Save and reuse your most important filter configurations.',
  },
  {
    emoji: '🧠',
    title: 'Behavior Intelligence',
    desc: 'Learns your patterns over time and surfaces recurring recommendations.',
  },
];

const flowSteps = [
  { label: 'Detect', desc: 'Monitor financial events' },
  { label: 'Signal', desc: 'Surface critical insights' },
  { label: 'Act', desc: 'Take immediate action' },
  { label: 'Analyze', desc: 'Track patterns over time' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Navbar */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 48px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px' }}>
          FinanceOS
        </div>
        <button
          onClick={() => navigate('/finance')}
          style={{
            padding: '8px 18px',
            background: 'var(--primary, #3b82f6)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Open App
        </button>
      </nav>

      {/* Hero */}
      <section style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '80px 48px 64px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-block',
          padding: '4px 12px',
          borderRadius: '20px',
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--primary, #3b82f6)',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          marginBottom: 24,
        }}>
          Finance Department System
        </div>
        <h1 style={{
          fontSize: 48,
          fontWeight: 800,
          letterSpacing: '-2px',
          lineHeight: 1.1,
          marginBottom: 20,
          color: 'var(--text-primary)',
        }}>
          Your AI-Powered<br />Finance Department
        </h1>
        <p style={{
          fontSize: 18,
          color: 'var(--text-muted)',
          lineHeight: 1.6,
          marginBottom: 36,
          maxWidth: 560,
          margin: '0 auto 36px',
        }}>
          Most finance apps show you what happened. FinanceOS tells you what matters and what to do next — analyzing your data, surfacing insights, and guiding action.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/finance')}
            style={{
              padding: '12px 28px',
              background: 'var(--primary, #3b82f6)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Open FinanceOS →
          </button>
          <button
            onClick={() => navigate('/finance/history')}
            style={{
              padding: '12px 28px',
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            View History
          </button>
        </div>
      </section>

      {/* Problem → Solution */}
      <section style={{
        maxWidth: 680,
        margin: '0 auto',
        padding: '0 48px 80px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          Most financial tools give you spreadsheets and dashboards. FinanceOS works like an in-house finance team — <strong style={{ color: 'var(--text-primary)' }}>monitoring, alerting, and recommending</strong> so you can focus on decisions, not data.
        </p>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '0 48px 80px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', textAlign: 'center', marginBottom: 48 }}>
          Built for action, not just observation
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
        }}>
          {features.map(({ emoji, title, desc }) => (
            <div key={title} className="card" style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{emoji}</div>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Product Flow */}
      <section style={{
        background: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        padding: '60px 48px',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-1px', marginBottom: 40 }}>
          The FinanceOS Loop
        </h2>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 0,
          flexWrap: 'wrap',
        }}>
          {flowSteps.map(({ label, desc }, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                padding: '16px 24px',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                background: 'var(--bg-base)',
                textAlign: 'center',
                minWidth: 120,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary, #3b82f6)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                  Step {i + 1}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
              </div>
              {i < flowSteps.length - 1 && (
                <div style={{ padding: '0 12px', color: 'var(--text-muted)', fontSize: 18 }}>→</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Screens Placeholder */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '80px 48px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', textAlign: 'center', marginBottom: 16 }}>
          What it looks like
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 40 }}>
          Screens adapt to context — no static dashboards
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
        }}>
          {[
            { label: 'Smart Dashboard', sub: 'Summary cards + charts + insights' },
            { label: 'Finance Signals', sub: 'Alerts with one-click actions' },
            { label: 'History + Filters', sub: 'URL-synced, shareable views' },
          ].map(({ label, sub }) => (
            <div key={label} style={{
              height: 160,
              border: '1px solid var(--border)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'var(--bg-elevated)',
            }}>
              <span style={{ fontSize: 32 }}>🖥️</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        background: 'rgba(99, 102, 241, 0.05)',
        borderTop: '1px solid rgba(99, 102, 241, 0.15)',
        padding: '80px 48px',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', marginBottom: 16 }}>
          Ready to use your Finance Department?
        </h2>
        <p style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 32 }}>
          Open FinanceOS and start taking action on your financial data.
        </p>
        <button
          onClick={() => navigate('/finance')}
          style={{
            padding: '14px 36px',
            background: 'var(--primary, #3b82f6)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Start using FinanceOS →
        </button>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '24px 48px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'var(--text-muted)',
        fontSize: 12,
      }}>
        <span>FinanceOS — Finance Department System</span>
        <span>React + Vite + localStorage</span>
      </footer>
    </div>
  );
}