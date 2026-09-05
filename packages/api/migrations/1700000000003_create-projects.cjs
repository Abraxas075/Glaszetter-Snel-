/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('project_status', ['concept', 'active', 'completed', 'archived']);

  pgm.createTable('projects', {
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
    customer_id: {
      type: 'uuid',
      notNull: true,
      references: 'customers',
      onDelete: 'CASCADE',
    },
    name: { type: 'text', notNull: true },
    address: { type: 'text' },
    city: { type: 'text' },
    description: { type: 'text' },
    status: { type: 'project_status', notNull: true, default: 'concept' },
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

  pgm.createIndex('projects', 'company_id');
  pgm.createIndex('projects', 'customer_id');
};

exports.down = (pgm) => {
  pgm.dropTable('projects');
  pgm.dropType('project_status');
};
