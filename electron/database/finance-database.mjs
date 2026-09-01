import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { migrations } from './migrations.mjs';
import { classifyTransaction, createLearnedRule, normalizeDescription } from '../domain/classification.mjs';
import { moneyToCents, requireIsoDate } from '../domain/financial-values.mjs';

const DEFAULT_ORGANIZATION_ID = 'org_default';
const DEFAULT_BANK_ACCOUNT_ID = 'account_checking_default';

const nowIso = () => new Date().toISOString();

function mapTransaction(row) {
  return {
    id: row.id,
    value: Math.abs(Number(row.amount_cents)) / 100,
    amountCents: Number(row.amount_cents),
    type: row.direction,
    description: row.description,
    date: row.posted_at,
    categoryId: row.category_id,
    category: row.category_name || null,
    suggestedCategoryId: row.suggested_category_id || null,
    suggestedCategory: row.suggested_category_name || null,
    suggestedRuleId: row.suggested_rule_id || null,
    suggestedConfidence: row.suggested_confidence == null ? null : Number(row.suggested_confidence),
    suggestedExplanation: row.suggested_explanation || null,
    accountId: row.bank_account_id,
    account: row.account_name,
    status: row.status,
    sourceType: row.source_type,
    importBatchId: row.import_batch_id,
    classification: row.rule_name ? {
      ruleId: row.rule_id,
      ruleName: row.rule_name,
      confidence: Number(row.match_confidence),
      explanation: row.match_explanation,
    } : null,
    createdAt: row.created_at,
  };
}

export class FinanceDatabase {
  constructor(filePath = ':memory:') {
    this.filePath = filePath;
    this.db = new DatabaseSync(filePath, { timeout: 5000 });
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;');
    this.migrate();
    this.recoverAbandonedSyncRuns();
    this.seedDefaults();
  }

  migrate() {
    const current = Number(this.db.prepare('PRAGMA user_version').get().user_version || 0);
    for (const migration of migrations.filter((item) => item.version > current)) {
      this.transaction(() => {
        this.db.exec(migration.sql);
        this.db.exec(`PRAGMA user_version = ${migration.version}`);
      });
    }
  }

  transaction(operation) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  recoverAbandonedSyncRuns() {
    const finishedAt = nowIso();
    return this.db.prepare(`
      UPDATE sync_runs
      SET status = 'failed', error_message = ?, finished_at = ?
      WHERE status = 'running'
    `).run('Execução abandonada: o aplicativo foi encerrado antes da confirmação do conector.', finishedAt).changes;
  }

  seedDefaults() {
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT OR IGNORE INTO organizations (id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(DEFAULT_ORGANIZATION_ID, 'Minha empresa', timestamp, timestamp);

    const accounts = [
      [DEFAULT_BANK_ACCOUNT_ID, '1.1.01', 'Conta bancária principal', 'asset', 'bank'],
      ['account_income_sales', '3.1.01', 'Receitas operacionais', 'income', 'revenue'],
      ['account_expense_suppliers', '4.1.01', 'Fornecedores e serviços', 'expense', 'operating'],
      ['account_expense_people', '4.1.02', 'Pessoal', 'expense', 'operating'],
      ['account_expense_taxes', '4.1.03', 'Impostos e taxas', 'expense', 'tax'],
      ['account_expense_financial', '4.1.04', 'Despesas financeiras', 'expense', 'financial'],
      ['account_expense_other', '4.9.99', 'Outras despesas', 'expense', 'other'],
    ];
    const insertAccount = this.db.prepare(`
      INSERT OR IGNORE INTO ledger_accounts
        (id, organization_id, code, name, kind, subtype, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'BRL', ?, ?)
    `);
    for (const [id, code, name, kind, subtype] of accounts) {
      insertAccount.run(id, DEFAULT_ORGANIZATION_ID, code, name, kind, subtype, timestamp, timestamp);
    }

    const categories = [
      ['category_income', 'Receitas', 'income', 'account_income_sales', '#63eab4'],
      ['category_suppliers', 'Fornecedores e serviços', 'expense', 'account_expense_suppliers', '#4d9de0'],
      ['category_people', 'Pessoal', 'expense', 'account_expense_people', '#f5c842'],
      ['category_taxes', 'Impostos e taxas', 'expense', 'account_expense_taxes', '#ff8f70'],
      ['category_financial', 'Despesas financeiras', 'expense', 'account_expense_financial', '#a78bfa'],
      ['category_other', 'Outras despesas', 'expense', 'account_expense_other', '#8892a4'],
    ];
    const insertCategory = this.db.prepare(`
      INSERT OR IGNORE INTO categories
        (id, organization_id, name, type, ledger_account_id, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const category of categories) {
      insertCategory.run(category[0], DEFAULT_ORGANIZATION_ID, category[1], category[2], category[3], category[4], timestamp, timestamp);
    }
  }

  close() {
    this.db.close();
  }

  listTransactions() {
    return this.db.prepare(`
      SELECT t.*, c.name AS category_name, sc.name AS suggested_category_name, a.name AS account_name,
             rm.rule_id, rm.confidence AS match_confidence, rm.explanation AS match_explanation,
             r.name AS rule_name
      FROM bank_transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN categories sc ON sc.id = t.suggested_category_id
      LEFT JOIN ledger_accounts a ON a.id = t.bank_account_id
      LEFT JOIN rule_matches rm ON rm.id = (
        SELECT id FROM rule_matches WHERE transaction_id = t.id ORDER BY created_at DESC LIMIT 1
      )
      LEFT JOIN classification_rules r ON r.id = rm.rule_id
      WHERE t.organization_id = ? AND t.status != 'ignored'
      ORDER BY t.posted_at DESC, t.created_at DESC
    `).all(DEFAULT_ORGANIZATION_ID).map(mapTransaction);
  }

  listCategories(type = null) {
    const rows = type
      ? this.db.prepare(`SELECT * FROM categories WHERE organization_id = ? AND active = 1 AND type IN (?, 'both') ORDER BY name`).all(DEFAULT_ORGANIZATION_ID, type)
      : this.db.prepare('SELECT * FROM categories WHERE organization_id = ? AND active = 1 ORDER BY type, name').all(DEFAULT_ORGANIZATION_ID);
    return rows.map((row) => ({ ...row, active: Boolean(row.active) }));
  }

  listAccounts() {
    return this.db.prepare(`
      SELECT * FROM ledger_accounts
      WHERE organization_id = ? AND active = 1
      ORDER BY code
    `).all(DEFAULT_ORGANIZATION_ID).map((row) => ({
      ...row,
      active: Boolean(row.active),
      statement_balance_cents: row.statement_balance_cents == null ? null : Number(row.statement_balance_cents),
    }));
  }

  createBankAccount(input) {
    const id = randomUUID();
    const timestamp = nowIso();
    const count = Number(this.db.prepare(`SELECT COUNT(*) AS total FROM ledger_accounts WHERE organization_id = ? AND subtype = 'bank'`).get(DEFAULT_ORGANIZATION_ID).total);
    this.db.prepare(`
      INSERT INTO ledger_accounts
        (id, organization_id, code, name, kind, subtype, institution, external_key, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'asset', 'bank', ?, ?, ?, ?, ?)
    `).run(id, DEFAULT_ORGANIZATION_ID, `1.1.${String(count + 1).padStart(2, '0')}`, input.name, input.institution || null, input.externalKey || null, input.currency || 'BRL', timestamp, timestamp);
    this.audit('ledger_account', id, 'created', { kind: 'asset', subtype: 'bank' });
    return this.listAccounts().find((account) => account.id === id);
  }

  createCategory(input) {
    const timestamp = nowIso();
    const ledgerAccountId = randomUUID();
    const categoryId = randomUUID();
    const kind = input.type === 'income' ? 'income' : 'expense';
    const prefix = kind === 'income' ? '3.9' : '4.9';
    const count = Number(this.db.prepare('SELECT COUNT(*) AS total FROM categories WHERE organization_id = ? AND type = ?').get(DEFAULT_ORGANIZATION_ID, input.type).total);
    this.transaction(() => {
      this.db.prepare(`
        INSERT INTO ledger_accounts
          (id, organization_id, code, name, kind, subtype, currency, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'category', 'BRL', ?, ?)
      `).run(ledgerAccountId, DEFAULT_ORGANIZATION_ID, `${prefix}.${String(count + 1).padStart(2, '0')}`, input.name, kind, timestamp, timestamp);
      this.db.prepare(`
        INSERT INTO categories
          (id, organization_id, name, type, ledger_account_id, color, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(categoryId, DEFAULT_ORGANIZATION_ID, input.name, input.type, ledgerAccountId, input.color || '#8892a4', timestamp, timestamp);
      this.audit('category', categoryId, 'created', { type: input.type });
    });
    return this.listCategories().find((category) => category.id === categoryId);
  }

  listRules() {
    return this.db.prepare(`
      SELECT r.*, c.name AS category_name
      FROM classification_rules r
      JOIN categories c ON c.id = r.category_id
      WHERE r.organization_id = ?
      ORDER BY r.priority DESC, r.created_at DESC
    `).all(DEFAULT_ORGANIZATION_ID).map((row) => ({ ...row, active: Boolean(row.active) }));
  }

  createRule(input) {
    const category = this.db.prepare('SELECT * FROM categories WHERE id = ? AND organization_id = ?').get(input.categoryId, DEFAULT_ORGANIZATION_ID);
    if (!category) throw new Error('Categoria não encontrada.');
    if (input.direction && ![input.direction, 'both'].includes(category.type)) {
      throw new Error('A categoria não corresponde ao movimento da regra.');
    }
    const duplicate = this.db.prepare(`
      SELECT id, pattern FROM classification_rules
      WHERE organization_id = ? AND field = ? AND operator = ?
        AND COALESCE(direction, '') = COALESCE(?, '')
        AND COALESCE(bank_account_id, '') = COALESCE(?, '')
        AND COALESCE(min_amount_cents, -1) = COALESCE(?, -1)
        AND COALESCE(max_amount_cents, -1) = COALESCE(?, -1)
    `).all(DEFAULT_ORGANIZATION_ID, input.field || 'description', input.operator, input.direction || null, input.bankAccountId || null, input.minAmountCents ?? null, input.maxAmountCents ?? null)
      .find((rule) => input.operator === 'regex' ? rule.pattern === input.pattern : normalizeDescription(rule.pattern) === normalizeDescription(input.pattern));
    if (duplicate) throw new Error('Já existe uma regra com este padrão e movimento.');
    const id = randomUUID();
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO classification_rules
        (id, organization_id, name, priority, active, field, operator, pattern, direction,
         bank_account_id, min_amount_cents, max_amount_cents, category_id, confidence, created_by,
         created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      DEFAULT_ORGANIZATION_ID,
      input.name,
      input.priority ?? 100,
      input.active === false ? 0 : 1,
      input.field || 'description',
      input.operator,
      input.pattern,
      input.direction || null,
      input.bankAccountId || null,
      input.minAmountCents ?? null,
      input.maxAmountCents ?? null,
      input.categoryId,
      input.confidence ?? 1,
      input.createdBy || 'user',
      timestamp,
      timestamp,
    );
    this.audit('classification_rule', id, 'created', { name: input.name });
    return this.listRules().find((rule) => rule.id === id);
  }

  deleteRule(id) {
    const result = this.db.prepare('DELETE FROM classification_rules WHERE id = ? AND organization_id = ?').run(id, DEFAULT_ORGANIZATION_ID);
    if (result.changes) this.audit('classification_rule', id, 'deleted', {});
    return Boolean(result.changes);
  }

  previewPendingRuleMatches() {
    const rules = this.listRules();
    const ruleById = new Map(rules.map((rule) => [rule.id, rule]));
    const pending = this.db.prepare(`
      SELECT * FROM bank_transactions
      WHERE organization_id = ? AND status = 'review'
      ORDER BY posted_at DESC, created_at DESC
    `).all(DEFAULT_ORGANIZATION_ID);
    const matches = [];

    for (const transaction of pending) {
      const classification = classifyTransaction({
        description: transaction.description,
        direction: transaction.direction,
        amountCents: transaction.amount_cents,
        bankAccountId: transaction.bank_account_id,
        transactionType: transaction.transaction_type,
        documentNumber: transaction.document_number,
      }, rules);
      if (!classification.ruleId || !classification.categoryId) continue;
      const rule = ruleById.get(classification.ruleId);
      this.db.prepare(`UPDATE bank_transactions SET suggested_category_id = ?, suggested_rule_id = ?,
        suggested_confidence = ?, suggested_explanation = ?, updated_at = ? WHERE id = ? AND status = 'review'`)
        .run(classification.categoryId, classification.ruleId, classification.confidence, classification.explanation, nowIso(), transaction.id);
      matches.push({
        transactionId: transaction.id,
        description: transaction.description,
        date: transaction.posted_at,
        value: Math.abs(Number(transaction.amount_cents)) / 100,
        direction: transaction.direction,
        ruleId: classification.ruleId,
        ruleName: rule?.name || 'Regra de classificação',
        categoryId: classification.categoryId,
        categoryName: rule?.category_name || 'Categoria sugerida',
        confidence: classification.confidence,
        automatic: !classification.requiresReview,
      });
    }

    return {
      pending: pending.length,
      unmatched: pending.length - matches.length,
      automatic: matches.filter((match) => match.automatic),
      suggestions: matches.filter((match) => !match.automatic),
    };
  }

  applyPendingRuleMatches({ approvedSuggestionIds = [] } = {}) {
    const approved = new Set(approvedSuggestionIds);
    const preview = this.previewPendingRuleMatches();
    const selected = [
      ...preview.automatic,
      ...preview.suggestions.filter((match) => approved.has(match.transactionId)),
    ];

    return this.transaction(() => {
      const timestamp = nowIso();
      const updateTransaction = this.db.prepare(`
        UPDATE bank_transactions
        SET category_id = ?, status = 'categorized',
            suggested_category_id = NULL, suggested_rule_id = NULL,
            suggested_confidence = NULL, suggested_explanation = NULL,
            updated_at = ?
        WHERE id = ? AND organization_id = ? AND status = 'review'
      `);
      const insertMatch = this.db.prepare(`
        INSERT INTO rule_matches (id, rule_id, transaction_id, confidence, explanation, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const clearSuggestion = this.db.prepare(`UPDATE bank_transactions SET suggested_category_id = NULL,
        suggested_rule_id = NULL, suggested_confidence = NULL, suggested_explanation = NULL, updated_at = ?
        WHERE id = ? AND organization_id = ? AND status = 'review'`);
      let applied = 0;
      let automaticApplied = 0;
      let confirmedApplied = 0;

      for (const match of selected) {
        const result = updateTransaction.run(match.categoryId, timestamp, match.transactionId, DEFAULT_ORGANIZATION_ID);
        if (!result.changes) continue;
        this.db.prepare('DELETE FROM journal_entries WHERE source_transaction_id = ?').run(match.transactionId);
        this.createJournalEntry(match.transactionId);
        insertMatch.run(randomUUID(), match.ruleId, match.transactionId, match.confidence, `Regra “${match.ruleName}” aplicada às pendências.`, timestamp);
        this.audit('bank_transaction', match.transactionId, 'rule_applied', { ruleId: match.ruleId, categoryId: match.categoryId, userConfirmed: !match.automatic });
        applied++;
        if (match.automatic) automaticApplied++;
        else confirmedApplied++;
      }
      for (const match of preview.suggestions) {
        if (approved.has(match.transactionId)) continue;
        clearSuggestion.run(timestamp, match.transactionId, DEFAULT_ORGANIZATION_ID);
        this.audit('bank_transaction', match.transactionId, 'rule_rejected', { ruleId: match.ruleId, categoryId: match.categoryId });
      }

      return {
        applied,
        automaticApplied,
        confirmedApplied,
        rejected: preview.suggestions.filter((match) => !approved.has(match.transactionId)).length,
        unmatched: preview.unmatched,
      };
    });
  }

  createTransaction(input) {
    const id = randomUUID();
    const timestamp = nowIso();
    const absoluteCents = moneyToCents(input.value, { name: 'Valor' });
    if (!['income', 'expense'].includes(input.type)) throw new Error('Tipo de transação inválido.');
    requireIsoDate(input.date);
    if (input.categoryId) {
      const category = this.db.prepare('SELECT type FROM categories WHERE id = ? AND organization_id = ?').get(input.categoryId, DEFAULT_ORGANIZATION_ID);
      if (!category) throw new Error('Categoria não encontrada.');
      if (![input.type, 'both'].includes(category.type)) throw new Error('A categoria não corresponde ao tipo da transação.');
    }
    if (input.accountId) {
      const account = this.db.prepare("SELECT 1 FROM ledger_accounts WHERE id = ? AND organization_id = ? AND subtype = 'bank'").get(input.accountId, DEFAULT_ORGANIZATION_ID);
      if (!account) throw new Error('Conta bancária não encontrada.');
    }
    const amountCents = absoluteCents * (input.type === 'expense' ? -1 : 1);
    const fingerprint = `manual:${id}`;

    this.transaction(() => {
      this.db.prepare(`
        INSERT INTO bank_transactions
          (id, organization_id, bank_account_id, fingerprint, posted_at, amount_cents, direction,
           description, normalized_description, category_id, status, source_type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?)
      `).run(
        id,
        DEFAULT_ORGANIZATION_ID,
        input.accountId || DEFAULT_BANK_ACCOUNT_ID,
        fingerprint,
        input.date,
        amountCents,
        input.type,
        input.description?.trim() || (input.type === 'income' ? 'Recebimento' : 'Gasto'),
        normalizeDescription(input.description || ''),
        input.categoryId || null,
        input.categoryId ? 'categorized' : 'review',
        timestamp,
        timestamp,
      );
      if (input.categoryId) this.createJournalEntry(id);
      this.audit('bank_transaction', id, 'created', { source: 'manual' });
    });
    return this.getTransaction(id);
  }

  getTransaction(id) {
    const row = this.db.prepare(`
      SELECT t.*, c.name AS category_name, sc.name AS suggested_category_name, a.name AS account_name,
             NULL AS rule_id, NULL AS match_confidence, NULL AS match_explanation, NULL AS rule_name
      FROM bank_transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN categories sc ON sc.id = t.suggested_category_id
      LEFT JOIN ledger_accounts a ON a.id = t.bank_account_id
      WHERE t.id = ? AND t.organization_id = ?
    `).get(id, DEFAULT_ORGANIZATION_ID);
    return row ? mapTransaction(row) : null;
  }

  deleteTransaction(id) {
    const result = this.db.prepare('DELETE FROM bank_transactions WHERE id = ? AND organization_id = ?').run(id, DEFAULT_ORGANIZATION_ID);
    if (result.changes) this.audit('bank_transaction', id, 'deleted', {});
    return Boolean(result.changes);
  }

  categorizeTransaction(id, categoryId, { learn = false } = {}) {
    return this.transaction(() => {
      const row = this.db.prepare('SELECT * FROM bank_transactions WHERE id = ? AND organization_id = ?').get(id, DEFAULT_ORGANIZATION_ID);
      if (!row) throw new Error('Transação não encontrada.');
      const category = this.db.prepare('SELECT * FROM categories WHERE id = ? AND organization_id = ?').get(categoryId, DEFAULT_ORGANIZATION_ID);
      if (!category) throw new Error('Categoria não encontrada.');
      if (![row.direction, 'both'].includes(category.type)) throw new Error('A categoria não corresponde ao tipo da transação.');
      this.db.prepare(`
        UPDATE bank_transactions
        SET category_id = ?, status = ?, suggested_category_id = NULL, suggested_rule_id = NULL,
            suggested_confidence = NULL, suggested_explanation = NULL, updated_at = ?
        WHERE id = ?
      `)
        .run(categoryId, 'categorized', nowIso(), id);
      this.db.prepare('DELETE FROM journal_entries WHERE source_transaction_id = ?').run(id);
      this.createJournalEntry(id);
      if (learn) {
        this.createRule(createLearnedRule({
          description: row.description,
          direction: row.direction,
          categoryId,
          bankAccountId: row.bank_account_id,
        }));
      }
      this.audit('bank_transaction', id, 'categorized', { categoryId, learn });
      return this.getTransaction(id);
    });
  }

  categorizeTransactions(ids, categoryId) {
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 5000) throw new Error('Lista de transações inválida.');
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length !== ids.length || uniqueIds.some((id) => typeof id !== 'string' || !id)) throw new Error('Lista de transações inválida.');

    return this.transaction(() => {
      const category = this.db.prepare('SELECT * FROM categories WHERE id = ? AND organization_id = ? AND active = 1').get(categoryId, DEFAULT_ORGANIZATION_ID);
      if (!category) throw new Error('Categoria não encontrada.');
      const selectTransaction = this.db.prepare('SELECT * FROM bank_transactions WHERE id = ? AND organization_id = ?');
      const updateTransaction = this.db.prepare(`
        UPDATE bank_transactions
        SET category_id = ?, status = 'categorized', suggested_category_id = NULL, suggested_rule_id = NULL,
            suggested_confidence = NULL, suggested_explanation = NULL, updated_at = ?
        WHERE id = ? AND organization_id = ?
      `);
      let updated = 0;
      let skipped = 0;
      const timestamp = nowIso();

      for (const id of uniqueIds) {
        const row = selectTransaction.get(id, DEFAULT_ORGANIZATION_ID);
        if (!row || ['reconciled', 'ignored'].includes(row.status) || ![row.direction, 'both'].includes(category.type)) {
          skipped++;
          continue;
        }
        updateTransaction.run(categoryId, timestamp, id, DEFAULT_ORGANIZATION_ID);
        this.db.prepare('DELETE FROM journal_entries WHERE source_transaction_id = ?').run(id);
        this.createJournalEntry(id);
        this.audit('bank_transaction', id, 'work_categorized', { categoryId });
        updated++;
      }

      return { updated, skipped, categoryId, categoryName: category.name };
    });
  }

  reconcileTransaction(id) {
    const row = this.db.prepare(`
      SELECT t.id, t.status, COALESCE(SUM(p.amount_cents), 0) AS balance
      FROM bank_transactions t
      LEFT JOIN journal_entries e ON e.source_transaction_id = t.id
      LEFT JOIN postings p ON p.journal_entry_id = e.id
      WHERE t.id = ? AND t.organization_id = ?
      GROUP BY t.id, t.status
    `).get(id, DEFAULT_ORGANIZATION_ID);
    if (!row) throw new Error('Transação não encontrada.');
    if (row.status === 'review') throw new Error('Classifique a transação antes de conciliá-la.');
    if (Number(row.balance) !== 0) throw new Error('O lançamento contábil não está balanceado.');
    this.db.prepare(`UPDATE bank_transactions SET status = 'reconciled', updated_at = ? WHERE id = ?`).run(nowIso(), id);
    this.audit('bank_transaction', id, 'reconciled', {});
    return this.getTransaction(id);
  }

  createJournalEntry(transactionId) {
    const transaction = this.db.prepare(`
      SELECT t.*, c.ledger_account_id
      FROM bank_transactions t JOIN categories c ON c.id = t.category_id
      WHERE t.id = ?
    `).get(transactionId);
    if (!transaction) return null;

    const entryId = randomUUID();
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO journal_entries
        (id, organization_id, source_transaction_id, entry_date, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'posted', ?, ?)
    `).run(entryId, DEFAULT_ORGANIZATION_ID, transactionId, transaction.posted_at, transaction.description, timestamp, timestamp);

    const amount = Math.abs(Number(transaction.amount_cents));
    const bankPosting = transaction.direction === 'income' ? amount : -amount;
    const categoryPosting = -bankPosting;
    const insertPosting = this.db.prepare(`
      INSERT INTO postings (id, journal_entry_id, ledger_account_id, amount_cents, memo, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertPosting.run(randomUUID(), entryId, transaction.bank_account_id, bankPosting, transaction.description, timestamp);
    insertPosting.run(randomUUID(), entryId, transaction.ledger_account_id, categoryPosting, transaction.description, timestamp);
    return entryId;
  }

  importNormalizedTransactions({ batch, account, accounts, statements, transactions }) {
    const timestamp = nowIso();
    const normalizedStatements = Array.isArray(statements) && statements.length
      ? statements
      : [{ account, transactions }];
    const normalizedAccounts = Array.isArray(accounts) && accounts.length
      ? accounts
      : normalizedStatements.map((statement) => statement.account);
    const normalizedTransactions = normalizedStatements.flatMap((statement) => statement.transactions.map((item) => ({
      ...item,
      accountExternalKey: item.accountExternalKey || statement.account.externalKey,
    })));
    const existingBatch = this.db.prepare(`
      SELECT * FROM import_batches WHERE organization_id = ? AND source_type = ? AND file_hash = ?
    `).get(DEFAULT_ORGANIZATION_ID, batch.sourceType, batch.fileHash);
    if (existingBatch) {
      for (const statementAccount of normalizedAccounts) this.updateAccountBalanceSnapshot(statementAccount, timestamp);
      return { batchId: existingBatch.id, alreadyImported: true, ...this.getBatchStats(existingBatch.id) };
    }

    return this.transaction(() => {
      const batchId = randomUUID();
      this.db.prepare(`
        INSERT INTO import_batches
          (id, organization_id, source_type, file_name, file_hash, status, total_rows, created_at)
        VALUES (?, ?, ?, ?, ?, 'processing', ?, ?)
      `).run(batchId, DEFAULT_ORGANIZATION_ID, batch.sourceType, batch.fileName, batch.fileHash, normalizedTransactions.length, timestamp);

      const bankAccountsByExternalKey = new Map();
      for (const statementAccount of normalizedAccounts) {
        let bankAccount = this.db.prepare('SELECT * FROM ledger_accounts WHERE organization_id = ? AND external_key = ?')
          .get(DEFAULT_ORGANIZATION_ID, statementAccount.externalKey);
        if (!bankAccount) {
          const accountId = randomUUID();
          const count = Number(this.db.prepare("SELECT COUNT(*) AS total FROM ledger_accounts WHERE organization_id = ? AND subtype = 'bank'").get(DEFAULT_ORGANIZATION_ID).total);
          this.db.prepare(`INSERT INTO ledger_accounts
            (id, organization_id, code, name, kind, subtype, institution, external_key, currency,
             statement_balance_cents, statement_balance_as_of, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'asset', 'bank', ?, ?, ?, ?, ?, ?, ?)`)
            .run(accountId, DEFAULT_ORGANIZATION_ID, `1.1.${String(count + 1).padStart(2, '0')}`,
              `Conta ${statementAccount.accountId}`, statementAccount.bankId || null, statementAccount.externalKey,
              statementAccount.currency || 'BRL', statementAccount.balanceCents, statementAccount.balanceAsOf,
              timestamp, timestamp);
          bankAccount = { id: accountId };
        } else {
          this.updateAccountBalanceSnapshot(statementAccount, timestamp, bankAccount.id);
        }
        bankAccountsByExternalKey.set(statementAccount.externalKey, bankAccount);
      }

      const rules = this.listRules();
      let imported = 0;
      let duplicates = 0;
      let review = 0;
      const insertTransaction = this.db.prepare(`
        INSERT OR IGNORE INTO bank_transactions
          (id, organization_id, bank_account_id, import_batch_id, external_id, fingerprint, posted_at,
           amount_cents, direction, description, normalized_description, transaction_type, document_number,
            category_id, suggested_category_id, suggested_rule_id, suggested_confidence, suggested_explanation,
            status, source_type, metadata_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ofx', ?, ?, ?)
      `);
      const insertMatch = this.db.prepare(`
        INSERT INTO rule_matches (id, rule_id, transaction_id, confidence, explanation, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const transaction of normalizedTransactions) {
        const bankAccount = bankAccountsByExternalKey.get(transaction.accountExternalKey);
        if (!bankAccount) throw new Error(`Conta OFX não encontrada para a transação ${transaction.rowNumber}.`);
        const candidate = { ...transaction, bankAccountId: bankAccount.id };
        const classification = classifyTransaction(candidate, rules);
        const transactionId = randomUUID();
        const result = insertTransaction.run(
          transactionId,
          DEFAULT_ORGANIZATION_ID,
          bankAccount.id,
          batchId,
          transaction.externalId,
          transaction.fingerprint,
          transaction.postedAt,
          transaction.amountCents,
          transaction.direction,
          transaction.description,
          transaction.normalizedDescription,
          transaction.transactionType,
          transaction.documentNumber,
          classification.requiresReview ? null : classification.categoryId,
          classification.requiresReview ? classification.categoryId : null,
          classification.requiresReview ? classification.ruleId : null,
          classification.requiresReview && classification.ruleId ? classification.confidence : null,
          classification.requiresReview && classification.ruleId ? classification.explanation : null,
          classification.requiresReview ? 'review' : 'categorized',
          JSON.stringify(transaction.metadata || {}),
          timestamp,
          timestamp,
        );
        if (!result.changes) {
          duplicates++;
          continue;
        }
        imported++;
        if (classification.requiresReview) review++;
        if (classification.ruleId) {
          insertMatch.run(randomUUID(), classification.ruleId, transactionId, classification.confidence, classification.explanation, timestamp);
        }
        if (classification.categoryId && !classification.requiresReview) this.createJournalEntry(transactionId);
      }

      this.db.prepare(`
        UPDATE import_batches
        SET status = 'completed', imported_rows = ?, duplicate_rows = ?, review_rows = ?, completed_at = ?
        WHERE id = ?
      `).run(imported, duplicates, review, nowIso(), batchId);
      this.audit('import_batch', batchId, 'completed', { imported, duplicates, review });
      return { batchId, alreadyImported: false, total: normalizedTransactions.length, imported, duplicates, review };
    });
  }

  updateAccountBalanceSnapshot(account, timestamp = nowIso(), knownAccountId = null) {
    if (account.balanceCents == null || !account.balanceAsOf) return false;
    const bankAccount = knownAccountId
      ? { id: knownAccountId }
      : this.db.prepare('SELECT id FROM ledger_accounts WHERE organization_id = ? AND external_key = ?')
        .get(DEFAULT_ORGANIZATION_ID, account.externalKey);
    if (!bankAccount) return false;
    const result = this.db.prepare(`
      UPDATE ledger_accounts
      SET statement_balance_cents = ?, statement_balance_as_of = ?, updated_at = ?
      WHERE id = ? AND (statement_balance_as_of IS NULL OR statement_balance_as_of <= ?)
    `).run(account.balanceCents, account.balanceAsOf, timestamp, bankAccount.id, account.balanceAsOf);
    return Boolean(result.changes);
  }

  listImportBatches() {
    return this.db.prepare(`
      SELECT * FROM import_batches WHERE organization_id = ? ORDER BY created_at DESC
    `).all(DEFAULT_ORGANIZATION_ID);
  }

  getBatchStats(batchId) {
    const row = this.db.prepare('SELECT * FROM import_batches WHERE id = ?').get(batchId);
    return row ? {
      total: Number(row.total_rows),
      imported: Number(row.imported_rows),
      duplicates: Number(row.duplicate_rows),
      review: Number(row.review_rows),
    } : { total: 0, imported: 0, duplicates: 0, review: 0 };
  }

  listConnectors() {
    return this.db.prepare(`SELECT id, type, name, enabled, config_json, created_at, updated_at FROM connectors WHERE organization_id = ? ORDER BY name`)
      .all(DEFAULT_ORGANIZATION_ID)
      .map((row) => ({ ...row, enabled: Boolean(row.enabled), config: JSON.parse(row.config_json || '{}') }));
  }

  saveConnector(input) {
    const timestamp = nowIso();
    const id = input.id || randomUUID();
    const exists = Boolean(this.db.prepare('SELECT 1 FROM connectors WHERE id = ?').get(id));
    this.db.prepare(`
      INSERT INTO connectors (id, organization_id, type, name, enabled, config_json, secret_key, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        name = excluded.name,
        enabled = excluded.enabled,
        config_json = excluded.config_json,
        secret_key = COALESCE(excluded.secret_key, connectors.secret_key),
        updated_at = excluded.updated_at
    `).run(id, DEFAULT_ORGANIZATION_ID, input.type, input.name, input.enabled ? 1 : 0, JSON.stringify(input.config || {}), input.secretKey || null, timestamp, timestamp);
    this.audit('connector', id, exists ? 'updated' : 'created', { type: input.type, name: input.name });
    return this.listConnectors().find((connector) => connector.id === id);
  }

  listExternalMappings(connectorId, entityType) {
    return this.db.prepare(`
      SELECT * FROM external_mappings
      WHERE connector_id = ? AND entity_type = ?
      ORDER BY created_at
    `).all(connectorId, entityType).map((row) => ({ ...row, metadata: JSON.parse(row.metadata_json || '{}') }));
  }

  saveExternalMapping({ connectorId, entityType, localId, externalId, metadata = {} }) {
    const timestamp = nowIso();
    const id = randomUUID();
    this.db.prepare(`
      INSERT INTO external_mappings
        (id, connector_id, entity_type, local_id, external_id, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(connector_id, entity_type, local_id) DO UPDATE SET
        external_id = excluded.external_id,
        metadata_json = excluded.metadata_json,
        updated_at = excluded.updated_at
    `).run(id, connectorId, entityType, localId, externalId, JSON.stringify(metadata), timestamp, timestamp);
    return this.listExternalMappings(connectorId, entityType).find((mapping) => mapping.local_id === localId);
  }

  listPendingAccountingEntries(connectorId) {
    const entries = this.db.prepare(`
      SELECT e.*
      FROM journal_entries e
      WHERE e.organization_id = ? AND e.status = 'posted'
        AND NOT EXISTS (
          SELECT 1 FROM external_mappings m
          WHERE m.connector_id = ? AND m.entity_type = 'journal_entry' AND m.local_id = e.id
        )
      ORDER BY e.entry_date, e.created_at
    `).all(DEFAULT_ORGANIZATION_ID, connectorId);

    const postingStatement = this.db.prepare(`
      SELECT * FROM postings WHERE journal_entry_id = ? ORDER BY amount_cents DESC
    `);
    return entries.map((entry) => {
      const postings = postingStatement.all(entry.id);
      const debit = postings.find((posting) => Number(posting.amount_cents) > 0);
      const credit = postings.find((posting) => Number(posting.amount_cents) < 0);
      if (!debit || !credit || postings.length !== 2) return null;
      return {
        id: entry.id,
        date: entry.entry_date,
        debitAccountId: debit.ledger_account_id,
        creditAccountId: credit.ledger_account_id,
        amountCents: Number(debit.amount_cents),
        historyCode: '1',
        description: entry.description,
      };
    }).filter(Boolean);
  }

  startSyncRun(connectorId, direction) {
    const id = randomUUID();
    this.db.prepare(`
      INSERT INTO sync_runs (id, connector_id, direction, status, started_at)
      VALUES (?, ?, ?, 'running', ?)
    `).run(id, connectorId, direction, nowIso());
    return id;
  }

  finishSyncRun(id, { status, processedCount = 0, errorMessage = null, checkpoint = null }) {
    this.db.prepare(`
      UPDATE sync_runs SET status = ?, processed_count = ?, error_message = ?, checkpoint = ?, finished_at = ?
      WHERE id = ?
    `).run(status, processedCount, errorMessage, checkpoint, nowIso(), id);
  }

  markAccountingEntriesExported(connectorId, entryIds, syncRunId) {
    if (!Array.isArray(entryIds)) throw new Error('IDs aceitos pelo conector são inválidos.');
    const uniqueIds = new Set(entryIds);
    if (uniqueIds.size !== entryIds.length) throw new Error('O conector confirmou IDs duplicados.');
    const run = this.db.prepare('SELECT connector_id, status FROM sync_runs WHERE id = ?').get(syncRunId);
    if (!run || run.connector_id !== connectorId || run.status !== 'running') throw new Error('Execução de sincronização inválida ou já finalizada.');
    const pendingIds = new Set(this.listPendingAccountingEntries(connectorId).map((entry) => entry.id));
    const unknownIds = entryIds.filter((entryId) => typeof entryId !== 'string' || !pendingIds.has(entryId));
    if (unknownIds.length) throw new Error('O conector confirmou lançamentos que não pertencem ao lote pendente.');
    this.transaction(() => {
      for (const entryId of entryIds) {
        this.saveExternalMapping({
          connectorId,
          entityType: 'journal_entry',
          localId: entryId,
          externalId: `sync:${syncRunId}:${entryId}`,
          metadata: { syncRunId },
        });
      }
    });
  }

  ingestApiTransaction(source, input) {
    if (!input.externalId) throw new Error('externalId é obrigatório para garantir idempotência.');
    const id = randomUUID();
    const timestamp = nowIso();
    const absoluteCents = moneyToCents(input.value, { name: 'value' });
    if (!['income', 'expense'].includes(input.type)) throw new Error('type deve ser income ou expense.');
    requireIsoDate(input.date, 'date');
    const amountCents = absoluteCents * (input.type === 'expense' ? -1 : 1);
    const fingerprint = `api:${source}:${input.externalId}`;
    const accountId = input.accountId || DEFAULT_BANK_ACCOUNT_ID;
    const account = this.db.prepare("SELECT 1 FROM ledger_accounts WHERE id = ? AND organization_id = ? AND subtype = 'bank'").get(accountId, DEFAULT_ORGANIZATION_ID);
    if (!account) throw new Error('accountId não identifica uma conta bancária válida.');
    if (input.categoryId) {
      const category = this.db.prepare('SELECT type FROM categories WHERE id = ? AND organization_id = ?').get(input.categoryId, DEFAULT_ORGANIZATION_ID);
      if (!category || ![input.type, 'both'].includes(category.type)) throw new Error('categoryId não corresponde ao tipo da transação.');
    }
    const classification = input.categoryId ? { categoryId: input.categoryId, requiresReview: false, ruleId: null } : classifyTransaction({
      description: input.description,
      direction: input.type,
      amountCents,
      bankAccountId: accountId,
      transactionType: input.transactionType,
      documentNumber: input.documentNumber,
    }, this.listRules());

    const result = this.db.prepare(`
      INSERT OR IGNORE INTO bank_transactions
        (id, organization_id, bank_account_id, external_id, fingerprint, posted_at, amount_cents, direction,
         description, normalized_description, transaction_type, document_number, category_id,
         suggested_category_id, suggested_rule_id, suggested_confidence, suggested_explanation, status,
         source_type, metadata_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      DEFAULT_ORGANIZATION_ID,
      accountId,
      input.externalId,
      fingerprint,
      input.date,
      amountCents,
      input.type,
      input.description || 'Movimentação recebida por API',
      normalizeDescription(input.description || ''),
      input.transactionType || null,
      input.documentNumber || null,
      classification.requiresReview ? null : classification.categoryId,
      classification.requiresReview ? classification.categoryId : null,
      classification.requiresReview ? classification.ruleId : null,
      classification.requiresReview && classification.ruleId ? classification.confidence : null,
      classification.requiresReview && classification.ruleId ? classification.explanation : null,
      classification.requiresReview ? 'review' : 'categorized',
      `api:${source}`,
      JSON.stringify(input.metadata || {}),
      timestamp,
      timestamp,
    );
    if (!result.changes) return { duplicate: true, transaction: null };
    if (classification.ruleId) {
      this.db.prepare(`
        INSERT INTO rule_matches (id, rule_id, transaction_id, confidence, explanation, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), classification.ruleId, id, classification.confidence, classification.explanation, timestamp);
    }
    if (classification.categoryId && !classification.requiresReview) this.createJournalEntry(id);
    this.audit('bank_transaction', id, 'ingested', { source, externalId: input.externalId });
    return { duplicate: false, transaction: this.getTransaction(id) };
  }

  audit(entityType, entityId, action, details) {
    this.db.prepare(`
      INSERT INTO audit_events (id, organization_id, entity_type, entity_id, action, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), DEFAULT_ORGANIZATION_ID, entityType, entityId, action, JSON.stringify(details || {}), nowIso());
  }
}

export const financeDefaults = {
  organizationId: DEFAULT_ORGANIZATION_ID,
  bankAccountId: DEFAULT_BANK_ACCOUNT_ID,
};
