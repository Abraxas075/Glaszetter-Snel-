exports.up = pgm => {
  pgm.addColumns('users', { username: { type: 'text' } });
  pgm.alterColumn('users', 'email', { notNull: false });
  pgm.sql("ALTER TABLE users ADD CONSTRAINT users_login_identifier CHECK (email IS NOT NULL OR username IS NOT NULL)");
  pgm.sql("ALTER TABLE users ADD CONSTRAINT users_username_format CHECK (username IS NULL OR username ~ '^[a-z][a-z0-9._-]{2,39}$')");
  pgm.sql('CREATE UNIQUE INDEX users_username_unique ON users (lower(username)) WHERE username IS NOT NULL');
};
exports.down = () => { throw new Error('Username accounts cannot be rolled back without an explicit account migration.'); };
