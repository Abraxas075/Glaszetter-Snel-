exports.up = pgm => {
  pgm.createTable('emergency_alerts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    company_id: { type: 'uuid', notNull: true, references: 'companies', onDelete: 'CASCADE' },
    revision: { type: 'uuid', notNull: true, default: pgm.func('gen_random_uuid()') },
    title: { type: 'text', notNull: true },
    description: { type: 'text', notNull: true, default: '' },
    address: { type: 'text', notNull: true, default: '' },
    phone: { type: 'text', notNull: true, default: '' },
    status: { type: 'text', notNull: true, default: 'open', check: "status IN ('open', 'in_progress', 'resolved')" },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('emergency_alerts', ['company_id', 'created_at']);
};
exports.down = pgm => pgm.dropTable('emergency_alerts');
