/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('measurement_status', ['draft', 'submitted', 'reviewed', 'approved']);

  pgm.createTable('measurements', {
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
    element_id: {
      type: 'uuid',
      notNull: true,
      references: 'elements',
      onDelete: 'CASCADE',
    },
    job_id: {
      type: 'uuid',
      notNull: true,
      references: 'jobs',
      onDelete: 'CASCADE',
    },
    width: { type: 'numeric(10,1)', notNull: true },
    height: { type: 'numeric(10,1)', notNull: true },
    glass_type: { type: 'text' },
    notes: { type: 'text' },
    photos: { type: 'text[]', notNull: true, default: '{}' },
    voice_memos: { type: 'text[]', notNull: true, default: '{}' },
    status: { type: 'measurement_status', notNull: true, default: 'draft' },
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

  pgm.createIndex('measurements', 'company_id');
  pgm.createIndex('measurements', 'element_id');
  pgm.createIndex('measurements', 'job_id');
};

exports.down = (pgm) => {
  pgm.dropTable('measurements');
  pgm.dropType('measurement_status');
};
