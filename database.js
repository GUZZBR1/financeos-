/**
 * services/database.js
 * Camada de acesso a dados usando localStorage como persistência.
 * Simula um banco de dados relacional com operações CRUD completas.
 */

const DB_KEY = 'financeos_transactions';

/**
 * Gera um ID único baseado em timestamp + random
 */
const generateId = () => `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Busca todas as transações do banco de dados
 * @returns {Array} Lista de transações
 */
export const getAllTransactions = () => {
  try {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao ler transações:', error);
    return [];
  }
};

/**
 * Salva uma nova transação
 * @param {Object} transaction - { value, type, description, date }
 * @returns {Object} Transação salva com ID gerado
 */
export const saveTransaction = (transaction) => {
  const transactions = getAllTransactions();
  const newTransaction = {
    id: generateId(),
    value: parseFloat(transaction.value),
    type: transaction.type, // 'income' | 'expense'
    description: transaction.description || '',
    date: transaction.date,
    createdAt: new Date().toISOString(),
  };

  transactions.push(newTransaction);
  localStorage.setItem(DB_KEY, JSON.stringify(transactions));
  return newTransaction;
};

/**
 * Deleta uma transação pelo ID
 * @param {string} id - ID da transação
 * @returns {boolean} Sucesso da operação
 */
export const deleteTransaction = (id) => {
  const transactions = getAllTransactions();
  const filtered = transactions.filter((t) => t.id !== id);
  localStorage.setItem(DB_KEY, JSON.stringify(filtered));
  return filtered.length < transactions.length;
};

/**
 * Seed de dados iniciais para demonstração
 */
export const seedDemoData = () => {
  const existing = getAllTransactions();
  if (existing.length > 0) return;

  const today = new Date();
  const demos = [
    { value: 8500, type: 'income', description: 'Contrato Cliente ABC', date: formatDate(subDays(today, 0)) },
    { value: 1200, type: 'expense', description: 'Servidor AWS - Mensal', date: formatDate(subDays(today, 1)) },
    { value: 3200, type: 'income', description: 'Consultoria Projeto XYZ', date: formatDate(subDays(today, 2)) },
    { value: 450, type: 'expense', description: 'Assinatura Adobe Suite', date: formatDate(subDays(today, 2)) },
    { value: 5000, type: 'income', description: 'Licença Software', date: formatDate(subDays(today, 4)) },
    { value: 2800, type: 'expense', description: 'Folha de Pagamento', date: formatDate(subDays(today, 5)) },
    { value: 1800, type: 'income', description: 'Suporte Técnico', date: formatDate(subDays(today, 6)) },
    { value: 380, type: 'expense', description: 'Domínio e Hospedagem', date: formatDate(subDays(today, 7)) },
    { value: 12000, type: 'income', description: 'Projeto Desenvolvimento Web', date: formatDate(subDays(today, 10)) },
    { value: 650, type: 'expense', description: 'Marketing Digital', date: formatDate(subDays(today, 12)) },
    { value: 2200, type: 'income', description: 'Manutenção de Sistemas', date: formatDate(subDays(today, 15)) },
    { value: 900, type: 'expense', description: 'Equipamentos de Escritório', date: formatDate(subDays(today, 18)) },
    { value: 4500, type: 'income', description: 'Treinamento Corporativo', date: formatDate(subDays(today, 20)) },
    { value: 1100, type: 'expense', description: 'Contabilidade', date: formatDate(subDays(today, 22)) },
    { value: 7800, type: 'income', description: 'Integração de Sistemas', date: formatDate(subDays(today, 25)) },
    { value: 550, type: 'expense', description: 'Licença Slack + Notion', date: formatDate(subDays(today, 27)) },
    { value: 3600, type: 'income', description: 'Auditoria de Segurança', date: formatDate(subDays(today, 28)) },
    { value: 2400, type: 'expense', description: 'Aluguel Coworking', date: formatDate(subDays(today, 29)) },
  ];

  demos.forEach(saveTransaction);
};

/** Helpers internos */
function subDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}
