exports.up = (pgm) => {
  pgm.createTable('meetbons', {
    job_id: { type: 'uuid', primaryKey: true, references: 'jobs', onDelete: 'CASCADE' },
    data: { type: 'jsonb', notNull: true },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
};
exports.down = (pgm) => pgm.dropTable('meetbons');
