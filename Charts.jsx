/**
 * components/Charts.jsx
 * Três gráficos interativos usando Recharts:
 * 1. BarChart — Entradas vs Saídas por dia
 * 2. LineChart — Evolução do saldo
 * 3. PieChart — Distribuição de gastos
 */

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../services/calculations';

// Paleta para o pie chart
const PIE_COLORS = ['#63eab4', '#4d9de0', '#f5c842', '#ff5f6b', '#a78bfa', '#fb923c'];

// Tooltip customizado global
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '10px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      {label && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>}
      {payload.map((item, i) => (
        <p key={i} style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: item.color, fontWeight: 500 }}>
          {item.name}: {formatCurrency(item.value)}
        </p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '10px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{name}</p>
      <p style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--accent-red)', fontWeight: 500 }}>
        {formatCurrency(value)}
      </p>
    </div>
  );
};

const ChartWrapper = ({ title, children, empty }) => (
  <div className="card" style={{ position: 'relative', minHeight: 280 }}>
    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>
      {title}
    </h3>
    {empty ? (
      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        Sem dados no período selecionado
      </div>
    ) : children}
  </div>
);

/**
 * Gráfico de Barras: Entradas vs Saídas
 */
export function BarChartCard({ data }) {
  const hasData = data && data.some(d => d.income > 0 || d.expense > 0);
  return (
    <ChartWrapper title="Entradas vs Saídas" empty={!hasData}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={4} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, fontFamily: 'var(--font-display)', paddingTop: 12 }}
          />
          <Bar dataKey="income" name="Entradas" fill="#63eab4" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" name="Saídas" fill="#ff5f6b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

/**
 * Gráfico de Linha: Evolução do Saldo
 */
export function LineChartCard({ data }) {
  const hasData = data && data.some(d => d.saldo !== 0);
  const isPositive = hasData && data[data.length - 1]?.saldo >= 0;

  return (
    <ChartWrapper title="Evolução do Saldo" empty={!hasData}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v >= -1000 ? v : `${(v/1000).toFixed(0)}k`}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="saldo"
            name="Saldo"
            stroke={isPositive ? '#63eab4' : '#ff5f6b'}
            strokeWidth={2.5}
            dot={{ fill: isPositive ? '#63eab4' : '#ff5f6b', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

/**
 * Gráfico de Pizza: Distribuição de Gastos
 */
export function PieChartCard({ data }) {
  const hasData = data && data.length > 0;
  const total = hasData ? data.reduce((s, d) => s + d.value, 0) : 0;

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.06) return null;
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#0a0b0f" textAnchor="middle" dominantBaseline="central"
        fontSize={11} fontWeight={700} fontFamily="var(--font-display)">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ChartWrapper title="Distribuição de Gastos" empty={!hasData}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <ResponsiveContainer width="60%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              labelLine={false}
              label={renderLabel}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Legend manual */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          {data.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: PIE_COLORS[i % PIE_COLORS.length],
                flexShrink: 0,
              }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </p>
                <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {((item.value / total) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ChartWrapper>
  );
}
