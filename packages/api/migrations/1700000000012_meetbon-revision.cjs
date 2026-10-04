exports.up = pgm => pgm.addColumns('meetbons', { revision: { type: 'uuid', notNull: true, default: pgm.func('gen_random_uuid()') } });
exports.down = pgm => pgm.dropColumns('meetbons', ['revision']);
