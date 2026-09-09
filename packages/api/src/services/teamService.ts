import type { PoolClient } from 'pg';
import type { Team } from '@glaszetter/shared';
import { pool } from '../db/pool';
import { mapTeamRow, type TeamRow } from '../db/rows';
import { NotFoundError } from '../errors';

export interface TeamInput {
  name: string;
  color?: string;
  memberIds?: string[];
}

const assertUsersInCompany = async (companyId: string, userIds: string[]): Promise<void> => {
  if (userIds.length === 0) return;
  const result = await pool.query<{ id: string }>(
    'SELECT id FROM users WHERE company_id = $1 AND id = ANY($2::uuid[])',
    [companyId, userIds]
  );
  if (result.rows.length !== new Set(userIds).size) {
    throw new NotFoundError('User');
  }
};

const getMemberIdsByTeam = async (teamIds: string[]): Promise<Map<string, string[]>> => {
  if (teamIds.length === 0) return new Map();
  const result = await pool.query<{ team_id: string; user_id: string }>(
    'SELECT team_id, user_id FROM team_members WHERE team_id = ANY($1::uuid[])',
    [teamIds]
  );
  const map = new Map<string, string[]>();
  for (const row of result.rows) {
    const existing = map.get(row.team_id) ?? [];
    existing.push(row.user_id);
    map.set(row.team_id, existing);
  }
  return map;
};

export const listTeams = async (companyId: string): Promise<Team[]> => {
  const result = await pool.query<TeamRow>(
    'SELECT * FROM teams WHERE company_id = $1 ORDER BY name ASC',
    [companyId]
  );
  const memberMap = await getMemberIdsByTeam(result.rows.map((row) => row.id));
  return result.rows.map((row) => mapTeamRow(row, memberMap.get(row.id) ?? []));
};

export const getTeam = async (companyId: string, id: string): Promise<Team> => {
  const result = await pool.query<TeamRow>(
    'SELECT * FROM teams WHERE id = $1 AND company_id = $2',
    [id, companyId]
  );
  const row = result.rows[0];
  if (!row) throw new NotFoundError('Team');
  const memberMap = await getMemberIdsByTeam([row.id]);
  return mapTeamRow(row, memberMap.get(row.id) ?? []);
};

const replaceMembers = async (
  client: PoolClient,
  teamId: string,
  memberIds: string[]
): Promise<void> => {
  await client.query('DELETE FROM team_members WHERE team_id = $1', [teamId]);
  for (const userId of memberIds) {
    await client.query(
      'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)',
      [teamId, userId]
    );
  }
};

export const createTeam = async (companyId: string, input: TeamInput): Promise<Team> => {
  const memberIds = input.memberIds ?? [];
  await assertUsersInCompany(companyId, memberIds);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query<TeamRow>(
      `INSERT INTO teams (company_id, name, color)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [companyId, input.name, input.color ?? null]
    );
    const team = result.rows[0];
    await replaceMembers(client, team.id, memberIds);

    await client.query('COMMIT');
    return mapTeamRow(team, memberIds);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const updateTeam = async (
  companyId: string,
  id: string,
  input: Partial<TeamInput>
): Promise<Team> => {
  const existing = await getTeam(companyId, id);

  if (input.memberIds) {
    await assertUsersInCompany(companyId, input.memberIds);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query<TeamRow>(
      `UPDATE teams SET
         name = COALESCE($3, name),
         color = COALESCE($4, color),
         updated_at = now()
       WHERE id = $1 AND company_id = $2
       RETURNING *`,
      [id, companyId, input.name ?? null, input.color ?? null]
    );

    const memberIds = input.memberIds ?? existing.memberIds;
    if (input.memberIds) {
      await replaceMembers(client, id, input.memberIds);
    }

    await client.query('COMMIT');
    return mapTeamRow(result.rows[0], memberIds);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const deleteTeam = async (companyId: string, id: string): Promise<void> => {
  const result = await pool.query('DELETE FROM teams WHERE id = $1 AND company_id = $2', [
    id,
    companyId,
  ]);
  if (result.rowCount === 0) throw new NotFoundError('Team');
};
