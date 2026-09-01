export const migrations = [
  {
    version: 1,
    name: 'initial-local-ledger',
    sql: `
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        document TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ledger_accounts (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('asset', 'liability', 'equity', 'income', 'expense')),
        subtype TEXT,
        institution TEXT,
        external_key TEXT,
        currency TEXT NOT NULL DEFAULT 'BRL',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (organization_id, code),
        UNIQUE (organization_id, external_key)
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'both')),
        ledger_account_id TEXT NOT NULL REFERENCES ledger_accounts(id),
        color TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (organization_id, name, type)
      );

      CREATE TABLE IF NOT EXISTS counterparties (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        document TEXT,
        kind TEXT NOT NULL DEFAULT 'other' CHECK (kind IN ('customer', 'supplier', 'employee', 'government', 'other')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS import_batches (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        source_type TEXT NOT NULL,
        file_name TEXT,
        file_hash TEXT,
        status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed', 'reverted')),
        total_rows INTEGER NOT NULL DEFAULT 0,
        imported_rows INTEGER NOT NULL DEFAULT 0,
        duplicate_rows INTEGER NOT NULL DEFAULT 0,
        review_rows INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        UNIQUE (organization_id, source_type, file_hash)
      );

      CREATE TABLE IF NOT EXISTS bank_transactions (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        bank_account_id TEXT NOT NULL REFERENCES ledger_accounts(id),
        import_batch_id TEXT REFERENCES import_batches(id) ON DELETE SET NULL,
        external_id TEXT,
        fingerprint TEXT NOT NULL,
        posted_at TEXT NOT NULL,
        amount_cents INTEGER NOT NULL CHECK (amount_cents != 0),
        direction TEXT NOT NULL CHECK (direction IN ('income', 'expense')),
        description TEXT NOT NULL,
        normalized_description TEXT NOT NULL,
        transaction_type TEXT,
        document_number TEXT,
        category_id TEXT REFERENCES categories(id),
        counterparty_id TEXT REFERENCES counterparties(id),
        status TEXT NOT NULL DEFAULT 'review' CHECK (status IN ('review', 'categorized', 'reconciled', 'ignored')),
        source_type TEXT NOT NULL DEFAULT 'manual',
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (organization_id, bank_account_id, fingerprint)
      );

      CREATE TABLE IF NOT EXISTS journal_entries (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        source_transaction_id TEXT UNIQUE REFERENCES bank_transactions(id) ON DELETE CASCADE,
        entry_date TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'void')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS postings (
        id TEXT PRIMARY KEY,
        journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
        ledger_account_id TEXT NOT NULL REFERENCES ledger_accounts(id),
        amount_cents INTEGER NOT NULL CHECK (amount_cents != 0),
        memo TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS classification_rules (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 100,
        active INTEGER NOT NULL DEFAULT 1,
        field TEXT NOT NULL DEFAULT 'description' CHECK (field IN ('description', 'transaction_type', 'document_number')),
        operator TEXT NOT NULL CHECK (operator IN ('equals', 'contains', 'starts_with', 'regex')),
        pattern TEXT NOT NULL,
        direction TEXT CHECK (direction IN ('income', 'expense')),
        bank_account_id TEXT REFERENCES ledger_accounts(id),
        min_amount_cents INTEGER,
        max_amount_cents INTEGER,
        category_id TEXT NOT NULL REFERENCES categories(id),
        confidence REAL NOT NULL DEFAULT 1 CHECK (confidence >= 0 AND confidence <= 1),
        created_by TEXT NOT NULL DEFAULT 'user' CHECK (created_by IN ('user', 'learned', 'system')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS rule_matches (
        id TEXT PRIMARY KEY,
        rule_id TEXT NOT NULL REFERENCES classification_rules(id) ON DELETE CASCADE,
        transaction_id TEXT NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
        confidence REAL NOT NULL,
        explanation TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS connectors (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 0,
        config_json TEXT NOT NULL DEFAULT '{}',
        secret_key TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (organization_id, name)
      );

      CREATE TABLE IF NOT EXISTS sync_runs (
        id TEXT PRIMARY KEY,
        connector_id TEXT NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
        direction TEXT NOT NULL CHECK (direction IN ('pull', 'push', 'bidirectional', 'test')),
        status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
        checkpoint TEXT,
        processed_count INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        started_at TEXT NOT NULL,
        finished_at TEXT
      );

      CREATE TABLE IF NOT EXISTS external_mappings (
        id TEXT PRIMARY KEY,
        connector_id TEXT NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
        entity_type TEXT NOT NULL,
        local_id TEXT NOT NULL,
        external_id TEXT NOT NULL,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (connector_id, entity_type, local_id),
        UNIQUE (connector_id, entity_type, external_id)
      );

      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        action TEXT NOT NULL,
        details_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_date ON bank_transactions(organization_id, posted_at DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_status ON bank_transactions(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_rules_priority ON classification_rules(organization_id, active, priority DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type, entity_id, created_at DESC);
    `,
  },
  {
    version: 2,
    name: 'ofx-bank-balance-snapshots',
    sql: `
      ALTER TABLE ledger_accounts ADD COLUMN statement_balance_cents INTEGER;
      ALTER TABLE ledger_accounts ADD COLUMN statement_balance_as_of TEXT;
    `,
  },
  {
    version: 3,
    name: 'separate-suggested-and-confirmed-categories',
    sql: `
      ALTER TABLE bank_transactions ADD COLUMN suggested_category_id TEXT REFERENCES categories(id) ON DELETE SET NULL;
      ALTER TABLE bank_transactions ADD COLUMN suggested_rule_id TEXT REFERENCES classification_rules(id) ON DELETE SET NULL;
      ALTER TABLE bank_transactions ADD COLUMN suggested_confidence REAL CHECK (suggested_confidence IS NULL OR (suggested_confidence >= 0 AND suggested_confidence <= 1));
      ALTER TABLE bank_transactions ADD COLUMN suggested_explanation TEXT;

      UPDATE bank_transactions
      SET suggested_category_id = category_id,
          suggested_rule_id = (
            SELECT rm.rule_id
            FROM rule_matches rm
            WHERE rm.transaction_id = bank_transactions.id
            ORDER BY rm.created_at DESC
            LIMIT 1
          ),
          suggested_confidence = (
            SELECT rm.confidence
            FROM rule_matches rm
            WHERE rm.transaction_id = bank_transactions.id
            ORDER BY rm.created_at DESC
            LIMIT 1
          ),
          suggested_explanation = (
            SELECT rm.explanation
            FROM rule_matches rm
            WHERE rm.transaction_id = bank_transactions.id
            ORDER BY rm.created_at DESC
            LIMIT 1
          ),
          category_id = NULL
      WHERE status = 'review' AND category_id IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_transactions_suggested_category
        ON bank_transactions(organization_id, suggested_category_id)
        WHERE status = 'review';

    `,
  },
];
