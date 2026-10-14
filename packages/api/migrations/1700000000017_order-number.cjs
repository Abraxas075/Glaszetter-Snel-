exports.up = pgm => {
  pgm.addColumns('jobs', { order_number: { type: 'text' } });
  pgm.sql("ALTER TABLE jobs ADD CONSTRAINT jobs_order_number_valid CHECK (order_number IS NULL OR (char_length(order_number) <= 60 AND btrim(order_number) <> ''))");
  pgm.sql('CREATE UNIQUE INDEX jobs_company_order_number_unique ON jobs (company_id, lower(order_number)) WHERE order_number IS NOT NULL');
};
exports.down = () => { throw new Error('Bestelnummers blijven behouden. Gebruik een expliciete datamigratie voor terugrollen.'); };
