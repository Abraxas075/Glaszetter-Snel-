/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('element_type', [
    'fixed_window',
    'casement',
    'tilt_turn',
    'door',
    'sliding',
    'transom',
    'sidelight',
    'glass_wall',
    'skylight',
    'bay_window',
    'other',
  ]);

  pgm.createTable('elements', {
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
    code: { type: 'text', notNull: true },
    type: { type: 'element_type', notNull: true },
    location: { type: 'text' },
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

  pgm.createIndex('elements', 'company_id');
  pgm.createIndex('elements', 'job_id');
};

exports.down = (pgm) => {
  pgm.dropTable('elements');
  pgm.dropType('element_type');
};
