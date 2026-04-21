# FinanceOS — Your AI-Powered Finance Department

A complete financial operations system that acts like an in-house finance department — analyzing your data, surfacing critical insights, and guiding users to take immediate action.

---

## Why FinanceOS?

Most financial tools show you what happened. FinanceOS tells you what matters and what to do next.

It combines smart analysis, proactive alerts, and actionable recommendations into a single, coherent system — so you spend less time digging through spreadsheets and more time making decisions.

---

## Core Features

### 📊 Smart Financial Dashboard
A real-time overview that goes beyond raw numbers. The dashboard synthesizes income, expenses, balance trends, and category breakdowns — then pairs them with AI-generated insights that put context behind the figures.

### 🚨 Finance Signals (Alerts & Suggestions)
Automatic detection of important financial events:
- **Negative balance warnings**
- **Expense spikes** vs previous periods
- **Revenue decline** signals
- **Dominant expense categories** (concentration risk)
- **Savings opportunities** based on spending patterns
- **Stability indicators** for healthy periods

Each signal carries an action button — so detection immediately leads to resolution.

### ⚡ Actionable Interface
FinanceOS doesn't just inform — it enables action directly from the dashboard:

- **Simulate savings** — see the impact of a 10% category cut, monthly and yearly
- **Review top expenses** — jump directly to filtered history
- **Filter by category** — contextually navigate to the relevant transactions
- **Open history** — pre-filtered to the right type and period

Results appear in a lightweight inline panel — no modals, no interruptions.

### 📁 Contextual Financial History
The history page adapts to how you arrived there. Actions from the dashboard pass filter context via URL — so `/finance/history?type=expense&category=Marketing` is a shared, bookmarkable view.

**Quick Views** provide one-click access to common contexts:
- All transactions
- Income only
- Expenses only
- Top expense category

URL-based state means every view is shareable and persists across sessions.

### 🔗 URL-Based State & Quick Views
Filter state lives in the URL query string — not in memory, not in localStorage. This means:
- Share a link directly to "Marketing expenses this month"
- Bookmark any filtered view
- Browser back/forward navigation works correctly
- No lost state on page reload

---

## Product Flow

```
Dashboard → Finance Signals → Action Buttons → Contextual History
                ↓
         ActionResultPanel
         (simulation / recommendation / filter result)
```

The core loop: **detect → act → investigate → repeat**.

Finance Signals surface what needs attention. Action buttons provide one-click paths to resolution. The history page receives context and renders the relevant data. The cycle repeats.

---

## Screens

> **Dashboard View** — Smart summary cards with insights, charts, and Finance Signals with action buttons.

> **Finance Signals** — Alerts and suggestions rendered as actionable cards, each with a direct action.

> **ActionResultPanel** — Inline panel showing savings simulation results or contextual recommendations.

> **History with Filters** — Full transaction history with Quick Views chips, URL-synced type/category filters, search, and sort.

> **Quick Views** — One-click filter chips that navigate to All / Income / Expenses / Top Category views.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + Vite |
| Routing | React Router DOM v6 |
| State | Context API |
| Charts | Recharts |
| Icons | Lucide React |
| Persistence | localStorage |
| Fonts | Syne + DM Mono (Google Fonts) |

No external databases. No credentials to manage. Data lives in the browser and survives reloads.

---

## Project Structure

```
src/
├── modules/finance/
│   ├── components/
│   │   ├── FinanceSignals.jsx        # Alert/suggestion cards with actions
│   │   └── ActionResultPanel.jsx     # Inline action result display
│   └── services/
│       ├── financeActions.js          # Action type → result mapping
│       ├── financeAlerts.js          # Alert/suggestion generation
│       ├── financeInsights.js        # AI-style insight generation
│       ├── financeHistoryUrlState.js # URL query string helpers
│       └── financeEvents.js
├── pages/Finance/
│   ├── FinanceDashboard.jsx          # Main finance department page
│   └── FinanceHistory.jsx            # History with URL-based filters
├── components/
│   ├── Sidebar.jsx, SummaryCards.jsx, Charts.jsx
│   ├── PeriodFilter.jsx, TransactionModal.jsx
│   └── TransactionRow.jsx
├── services/
│   ├── database.js                   # localStorage CRUD
│   └── calculations.js               # Pure financial calculations
├── context/
│   └── TransactionContext.jsx       # Global transaction state
└── App.jsx                           # Routing and providers
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Roadmap

- [ ] **Multi-user support** — team access and role-based permissions
- [ ] **Backend integration** — REST API replacing localStorage
- [ ] **AI-powered recommendations** — smarter savings and expense insights
- [ ] **Saved Views** — persistent user-defined filter presets
- [ ] **Advanced automation** — recurring transaction rules and scheduled alerts
- [ ] **Export & reports** — PDF/CSV generation for stakeholders

---

## Philosophy

FinanceOS is built on the principle that financial tools should reduce cognitive load — not increase it. Every feature either surfaces something important or removes friction from acting on it.

If you find yourself opening the history page to manually look for something — that's a Finance Signal that should have found you first.
