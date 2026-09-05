/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('job_status', [
    'concept',
    'measuring',
    'quote',
    'approved',
    'ordered',
    'delivery_expected',
    'scheduled',
    'in_progress',
    'completion',
    'completed',
    'invoiced',
  ]);

  pgm.createTable('jobs', {
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
    project_id: {
      type: 'uuid',
      notNull: true,
      references: 'projects',
      onDelete: 'CASCADE',
    },
    name: { type: 'text', notNull: true },
    status: { type: 'job_status', notNull: true, default: 'concept' },
    due_date: { type: 'timestamptz' },
    team_id: { type: 'uuid' },
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

  pgm.createIndex('jobs', 'company_id');
  pgm.createIndex('jobs', 'project_id');
};

exports.down = (pgm) => {
  pgm.dropTable('jobs');
  pgm.dropType('job_status');
};
