exports.up = (pgm) => {
  pgm.createTable('chat_messages', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    sequence: { type: 'bigserial', notNull: true, unique: true },
    company_id: { type: 'uuid', notNull: true, references: 'companies', onDelete: 'CASCADE' },
    job_id: { type: 'uuid', references: 'jobs', onDelete: 'RESTRICT' },
    sender_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    client_id: { type: 'uuid', notNull: true },
    body: { type: 'text', notNull: true },
    attachment_key: { type: 'text' },
    attachment_url: { type: 'text' },
    attachment_kind: { type: 'text' },
    attachment_filename: { type: 'text' },
    attachment_type: { type: 'text' },
    attachment_size: { type: 'integer' },
    attachment_hash: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('chat_messages', 'chat_body_length', {
    check: 'length(body) <= 4000 AND (length(btrim(body)) > 0 OR attachment_key IS NOT NULL)',
  });
  pgm.addConstraint('chat_messages', 'chat_retry_unique', {
    unique: ['company_id', 'sender_id', 'client_id'],
  });
  pgm.createIndex('chat_messages', ['company_id', 'job_id', 'sequence']);
};
exports.down = (pgm) => pgm.dropTable('chat_messages');
