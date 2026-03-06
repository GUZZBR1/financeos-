# FinanceOS — Gestão Financeira Empresarial

Dashboard financeiro moderno para registrar e visualizar transações empresariais.

## Estrutura do Projeto

```
financeos/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx                    # Entry point React
    ├── App.jsx                     # Roteamento + Providers
    ├── index.css                   # Design system global
    │
    ├── context/
    │   └── TransactionContext.jsx  # Estado global (React Context)
    │
    ├── services/
    │   ├── database.js             # CRUD localStorage
    │   └── calculations.js        # Cálculos financeiros e dados para gráficos
    │
    ├── components/
    │   ├── Sidebar.jsx             # Navegação lateral + mobile
    │   ├── TransactionModal.jsx    # Formulário de nova transação
    │   ├── SummaryCards.jsx        # Cards: saldo, entradas, saídas
    │   ├── PeriodFilter.jsx        # Filtro de período
    │   ├── Charts.jsx              # BarChart, LineChart, PieChart
    │   └── TransactionRow.jsx      # Linha individual de transação
    │
    └── pages/
        ├── Dashboard.jsx           # Página principal com gráficos
        └── History.jsx             # Histórico com filtros e ordenação
```

## Funcionalidades

- **Registro de transações**: entradas e saídas com valor, descrição e data
- **Dashboard financeiro**: saldo, totais e 3 gráficos interativos
- **Gráficos**: Entradas vs Saídas (barras), Evolução do saldo (linha), Distribuição de gastos (pizza)
- **Filtros de período**: Hoje, 5 dias, 7 dias, 30 dias, este mês, personalizado
- **Histórico completo**: busca, filtro por tipo, ordenação por data ou valor
- **Persistência**: dados salvos no localStorage (sobrevivem ao reload)
- **Demo data**: 18 transações de exemplo carregadas automaticamente
- **Responsivo**: layout adaptado para mobile

## Instalação e execução

### Requisitos
- Node.js 18+ 
- npm ou yarn

### Passos

```bash
# 1. Entrar na pasta do projeto
cd financeos

# 2. Instalar dependências
npm install

# 3. Rodar em modo desenvolvimento
npm run dev

# 4. Abrir no navegador
# http://localhost:5173
```

### Build para produção

```bash
npm run build
npm run preview
```

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Framework | React 18 + Vite |
| Roteamento | React Router DOM v6 |
| Gráficos | Recharts |
| Datas | date-fns |
| Ícones | Lucide React |
| Persistência | localStorage (zero config) |
| Fontes | Syne + DM Mono (Google Fonts) |

## Decisões de Arquitetura

**localStorage vs Firebase/SQLite**: O localStorage foi escolhido para eliminar dependências externas e configuração de credenciais. Os dados persistem entre sessões e a aplicação funciona offline. Para um ambiente de produção com múltiplos usuários, substitua o `services/database.js` por chamadas a uma API REST.

**React Context vs Redux**: Para o escopo desta aplicação, o Context API é suficiente e mantém o código simples. O hook `useTransactions()` provê acesso global ao estado em qualquer componente.

**Funções puras em `calculations.js`**: Toda lógica de cálculo é isolada em funções puras sem efeitos colaterais, facilitando testes unitários e reuso.
