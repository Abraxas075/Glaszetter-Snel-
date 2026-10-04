interface Queryable {
  query(sql: string): Promise<{ rows: Record<string, unknown>[] }>;
}

// Check the storage used by the meetbon and existing work-data deletion guards.
// This is read-only; schema changes remain in the migration/deployment step.
export async function assertDatabaseReady(db: Queryable): Promise<void> {
  const result = await db.query(`SELECT table_name, column_name, udt_name, is_nullable
    FROM information_schema.columns WHERE table_schema = current_schema()`);
  const columns = new Map(result.rows.map(row => [`${row.table_name}.${row.column_name}`, row]));
  const required: Record<string, string> = {
    'jobs.id': 'uuid', 'jobs.company_id': 'uuid', 'jobs.project_id': 'uuid',
    'jobs.team_id': 'uuid', 'jobs.scheduled_date': 'date',
    'meetbons.revision': 'uuid', 'meetbons.job_id': 'uuid', 'meetbons.data': 'jsonb', 'meetbons.updated_at': 'timestamptz',
    'elements.job_id': 'uuid', 'measurements.job_id': 'uuid', 'photos.job_id': 'uuid',
    'quotes.job_id': 'uuid', 'invoices.job_id': 'uuid',
    'companies.id': 'uuid', 'customers.id': 'uuid', 'projects.id': 'uuid',
    'users.id': 'uuid', 'teams.id': 'uuid', 'team_members.team_id': 'uuid',
  };
  const problems = Object.entries(required).filter(([key, type]) => columns.get(key)?.udt_name !== type).map(([key]) => key);
  for (const key of ['meetbons.revision', 'meetbons.job_id', 'meetbons.data', 'meetbons.updated_at']) {
    if (columns.has(key) && columns.get(key)?.is_nullable !== 'NO') problems.push(`${key} NOT NULL`);
  }
  if (!problems.length) {
    const constraints = await db.query(`SELECT c.contype, c.confdeltype,
        pg_get_constraintdef(c.oid) AS definition
      FROM pg_constraint c WHERE c.conrelid = 'meetbons'::regclass`);
    if (!constraints.rows.some(row => row.contype === 'p' && row.definition === 'PRIMARY KEY (job_id)')) problems.push('meetbons primary key');
    if (!constraints.rows.some(row => row.contype === 'f' && row.confdeltype === 'c'
      && /^FOREIGN KEY \(job_id\) REFERENCES (?:[^ ]+\.)?jobs\(id\) ON DELETE CASCADE$/.test(String(row.definition)))) problems.push('meetbons job foreign key ON DELETE CASCADE');
  }
  if (problems.length) throw new Error(`API start geweigerd: onvolledige databasestructuur (${problems.join(', ')}). Voer eerst npm run migrate --workspace=@glaszetter/api uit.`);
}
