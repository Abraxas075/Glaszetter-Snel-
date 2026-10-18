exports.up = (pgm) => {
  pgm.createTable('job_videos', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    company_id: { type: 'uuid', notNull: true, references: 'companies', onDelete: 'CASCADE' },
    job_id: { type: 'uuid', notNull: true, references: 'jobs', onDelete: 'RESTRICT' },
    storage_key: { type: 'text', notNull: true },
    url: { type: 'text', notNull: true },
    filename: { type: 'text', notNull: true },
    content_type: { type: 'text', notNull: true },
    size_bytes: { type: 'integer', notNull: true },
    caption: { type: 'text', notNull: true, default: '' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('job_videos', ['company_id', 'job_id']);
};
exports.down = (pgm) => pgm.dropTable('job_videos');
