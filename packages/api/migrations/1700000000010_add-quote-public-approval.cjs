/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('quotes', {
    public_token: {
      type: 'uuid',
      notNull: true,
      unique: true,
      default: pgm.func('gen_random_uuid()'),
    },
    approved_at: { type: 'timestamptz' },
    rejected_at: { type: 'timestamptz' },
    rejection_reason: { type: 'text' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('quotes', ['public_token', 'approved_at', 'rejected_at', 'rejection_reason']);
};
