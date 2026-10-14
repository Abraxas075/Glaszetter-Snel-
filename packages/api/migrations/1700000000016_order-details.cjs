exports.up = pgm => {
  pgm.addColumns('jobs', { supplier_name: { type: 'text' }, delivery_date: { type: 'date' } });
  pgm.sql("ALTER TABLE jobs ADD CONSTRAINT jobs_supplier_name_valid CHECK (supplier_name IS NULL OR (char_length(supplier_name) <= 200 AND btrim(supplier_name) <> ''))");
  pgm.sql("ALTER TABLE jobs ADD CONSTRAINT jobs_delivery_date_valid CHECK (delivery_date IS NULL OR delivery_date BETWEEN DATE '0001-01-01' AND DATE '9999-12-31')");
};
exports.down = () => { throw new Error('Bestelgegevens blijven behouden. Gebruik een expliciete datamigratie voor terugrollen.'); };
