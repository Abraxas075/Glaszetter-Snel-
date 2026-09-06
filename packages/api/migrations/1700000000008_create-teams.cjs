/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('teams', {
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
    name: { type: 'text', notNull: true },
    color: { type: 'text' },
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
  pgm.createIndex('teams', 'company_id');

  pgm.createTable('team_members', {
    team_id: {
      type: 'uuid',
      notNull: true,
      references: 'teams',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
  });
  pgm.addConstraint('team_members', 'team_members_pkey', {
    primaryKey: ['team_id', 'user_id'],
  });
  pgm.createIndex('team_members', 'user_id');

  pgm.addConstraint('jobs', 'jobs_team_id_fkey', {
    foreignKeys: {
      columns: 'team_id',
      references: 'teams(id)',
      onDelete: 'SET NULL',
    },
  });

  pgm.addColumn('jobs', {
    scheduled_date: { type: 'date' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('jobs', 'scheduled_date');
  pgm.dropConstraint('jobs', 'jobs_team_id_fkey');
  pgm.dropTable('team_members');
  pgm.dropTable('teams');
};
