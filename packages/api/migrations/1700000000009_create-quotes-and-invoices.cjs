/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('companies', {
    iban: { type: 'text' },
  });

  pgm.createType('quote_status', ['concept', 'sent', 'approved', 'rejected', 'expired']);
  pgm.createType('invoice_status', ['concept', 'sent', 'paid', 'overdue']);

  pgm.createTable('quotes', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    company_id: {
      type: 'uuid',
      notNull: true,
      references: 'companies',
      onDelete: 'CASCADE',
    },
    job_id: {
      type: 'uuid',
      notNull: true,
      references: 'jobs',
      onDelete: 'CASCADE',
    },
    project_id: {
      type: 'uuid',
      notNull: true,
      references: 'projects',
      onDelete: 'CASCADE',
    },
    quote_number: { type: 'text', notNull: true },
    status: { type: 'quote_status', notNull: true, default: 'concept' },
    vat_rate: { type: 'numeric(5,2)', notNull: true, default: 21 },
    valid_until: { type: 'date' },
    notes: { type: 'text' },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
  pgm.createIndex('quotes', 'company_id');
  pgm.createIndex('quotes', 'job_id');

  pgm.createTable('quote_lines', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    quote_id: {
      type: 'uuid',
      notNull: true,
      references: 'quotes',
      onDelete: 'CASCADE',
    },
    element_id: {
      type: 'uuid',
      references: 'elements',
      onDelete: 'SET NULL',
    },
    description: { type: 'text', notNull: true },
    quantity: { type: 'numeric(10,2)', notNull: true, default: 1 },
    unit_price: { type: 'numeric(10,2)', notNull: true, default: 0 },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
  pgm.createIndex('quote_lines', 'quote_id');

  pgm.createTable('invoices', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    company_id: {
      type: 'uuid',
      notNull: true,
      references: 'companies',
      onDelete: 'CASCADE',
    },
    job_id: {
      type: 'uuid',
      notNull: true,
      references: 'jobs',
      onDelete: 'CASCADE',
    },
    project_id: {
      type: 'uuid',
      notNull: true,
      references: 'projects',
      onDelete: 'CASCADE',
    },
    quote_id: {
      type: 'uuid',
      references: 'quotes',
      onDelete: 'SET NULL',
    },
    invoice_number: { type: 'text', notNull: true },
    status: { type: 'invoice_status', notNull: true, default: 'concept' },
    vat_rate: { type: 'numeric(5,2)', notNull: true, default: 21 },
    due_date: { type: 'date' },
    notes: { type: 'text' },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
  pgm.createIndex('invoices', 'company_id');
  pgm.createIndex('invoices', 'job_id');

  pgm.createTable('invoice_lines', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    invoice_id: {
      type: 'uuid',
      notNull: true,
      references: 'invoices',
      onDelete: 'CASCADE',
    },
    element_id: {
      type: 'uuid',
      references: 'elements',
      onDelete: 'SET NULL',
    },
    description: { type: 'text', notNull: true },
    quantity: { type: 'numeric(10,2)', notNull: true, default: 1 },
    unit_price: { type: 'numeric(10,2)', notNull: true, default: 0 },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
  pgm.createIndex('invoice_lines', 'invoice_id');
};

exports.down = (pgm) => {
  pgm.dropTable('invoice_lines');
  pgm.dropTable('invoices');
  pgm.dropTable('quote_lines');
  pgm.dropTable('quotes');
  pgm.dropType('invoice_status');
  pgm.dropType('quote_status');
  pgm.dropColumn('companies', 'iban');
};
