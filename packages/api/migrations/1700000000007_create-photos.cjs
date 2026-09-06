/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('photos', {
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
      references: 'jobs',
      onDelete: 'CASCADE',
    },
    element_id: {
      type: 'uuid',
      references: 'elements',
      onDelete: 'CASCADE',
    },
    storage_key: { type: 'text', notNull: true },
    url: { type: 'text', notNull: true },
    original_filename: { type: 'text' },
    content_type: { type: 'text' },
    size_bytes: { type: 'integer' },
    caption: { type: 'text' },
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

  pgm.addConstraint('photos', 'photos_job_or_element_required', {
    check: 'job_id IS NOT NULL OR element_id IS NOT NULL',
  });

  pgm.createIndex('photos', 'company_id');
  pgm.createIndex('photos', 'job_id');
  pgm.createIndex('photos', 'element_id');
};

exports.down = (pgm) => {
  pgm.dropTable('photos');
};
