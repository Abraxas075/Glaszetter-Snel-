'use client';

import { useEffect, useState } from 'react';
import type { Team, User, UserRole } from '@glaszetter/shared';
import { useAuth } from '../../../contexts/AuthContext';
import { createUser, listUsers } from '../../../lib/users';
import { createTeam, listTeams, updateTeam } from '../../../lib/teams';
import { ApiError } from '../../../lib/api';
import { USER_ROLE_LABELS, USER_ROLES } from '../../../constants/statusLabels';
import { pageStyles, formStyles } from '../../../styles/shared';

export default function TeamPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  const [users, setUsers] = useState<User[] | null>(null);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    listUsers()
      .then(setUsers)
      .catch(() => setError('Kon medewerkers niet laden.'));
    listTeams()
      .then(setTeams)
      .catch(() => setError('Kon teams niet laden.'));
  };

  useEffect(load, []);

  if (!isAdmin) {
    return (
      <div>
        <h1 style={pageStyles.title}>Team</h1>
        <p style={pageStyles.empty}>
          Alleen eigenaren en beheerders kunnen medewerkers en teams beheren.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={pageStyles.title}>Team</h1>
      {error && <p style={pageStyles.error}>{error}</p>}

      <EmployeesSection users={users} onCreated={load} />
      <TeamsSection users={users ?? []} teams={teams} onChanged={load} />
    </div>
  );
}

function EmployeesSection({
  users,
  onCreated,
}: {
  users: User[] | null;
  onCreated: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('glaszetter');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !email.trim() || password.length < 8) {
      setFormError('Naam, e-mail en een wachtwoord van minstens 8 tekens zijn verplicht.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createUser({ name: name.trim(), email: email.trim(), password, role });
      setName('');
      setEmail('');
      setPassword('');
      setRole('glaszetter');
      setShowForm(false);
      onCreated();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Aanmaken is mislukt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section style={{ marginBottom: 'var(--spacing-xxl)' }}>
      <div style={pageStyles.headerRow}>
        <h2 style={{ ...pageStyles.title, fontSize: 18 }}>Medewerkers</h2>
        <button style={pageStyles.primaryButton} onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annuleren' : '+ Nieuwe medewerker'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={formStyles.card}>
          <label style={formStyles.label} htmlFor="emp-name">
            Naam
          </label>
          <input
            id="emp-name"
            style={formStyles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label style={formStyles.label} htmlFor="emp-email">
            E-mail
          </label>
          <input
            id="emp-email"
            type="email"
            style={formStyles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label style={formStyles.label} htmlFor="emp-password">
            Wachtwoord
          </label>
          <input
            id="emp-password"
            type="password"
            style={formStyles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label style={formStyles.label} htmlFor="emp-role">
            Rol
          </label>
          <select
            id="emp-role"
            style={formStyles.select}
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {USER_ROLE_LABELS[r]}
              </option>
            ))}
          </select>

          {formError && <p style={pageStyles.error}>{formError}</p>}

          <button type="submit" style={formStyles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Opslaan...' : 'Opslaan'}
          </button>
        </form>
      )}

      {users === null && <p style={pageStyles.empty}>Laden...</p>}
      {users && users.length > 0 && (
        <table style={pageStyles.table}>
          <thead>
            <tr>
              <th style={pageStyles.th}>Naam</th>
              <th style={pageStyles.th}>E-mail</th>
              <th style={pageStyles.th}>Rol</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={pageStyles.td}>{u.name}</td>
                <td style={pageStyles.td}>{u.email}</td>
                <td style={pageStyles.td}>{USER_ROLE_LABELS[u.role]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function TeamsSection({
  users,
  teams,
  onChanged,
}: {
  users: User[];
  teams: Team[] | null;
  onChanged: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2F6FED');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const toggleMember = (id: string) => {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Naam is verplicht.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createTeam({ name: name.trim(), color, memberIds });
      setName('');
      setColor('#2F6FED');
      setMemberIds([]);
      setShowForm(false);
      onChanged();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Aanmaken is mislukt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? '—';

  const handleRemoveMember = async (team: Team, userId: string) => {
    try {
      await updateTeam(team.id, { memberIds: team.memberIds.filter((id) => id !== userId) });
      onChanged();
    } catch {
      // stil laten staan bij een netwerkfout, gebruiker kan het opnieuw proberen
    }
  };

  return (
    <section>
      <div style={pageStyles.headerRow}>
        <h2 style={{ ...pageStyles.title, fontSize: 18 }}>Teams</h2>
        <button style={pageStyles.primaryButton} onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annuleren' : '+ Nieuw team'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={formStyles.card}>
          <label style={formStyles.label} htmlFor="team-name">
            Naam
          </label>
          <input
            id="team-name"
            style={formStyles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Team Noord"
          />

          <label style={formStyles.label} htmlFor="team-color">
            Kleur
          </label>
          <input
            id="team-color"
            type="color"
            style={{ ...formStyles.input, padding: 4, height: 42 }}
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />

          <label style={formStyles.label}>Leden</label>
          <div style={memberListStyle}>
            {users.length === 0 && <p style={pageStyles.empty}>Nog geen medewerkers.</p>}
            {users.map((u) => (
              <label key={u.id} style={memberRowStyle}>
                <input
                  type="checkbox"
                  checked={memberIds.includes(u.id)}
                  onChange={() => toggleMember(u.id)}
                />
                {u.name} ({USER_ROLE_LABELS[u.role]})
              </label>
            ))}
          </div>

          {formError && <p style={pageStyles.error}>{formError}</p>}

          <button type="submit" style={formStyles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Opslaan...' : 'Opslaan'}
          </button>
        </form>
      )}

      {teams === null && <p style={pageStyles.empty}>Laden...</p>}
      {teams && teams.length === 0 && <p style={pageStyles.empty}>Nog geen teams aangemaakt.</p>}
      {teams && teams.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {teams.map((team) => (
            <div key={team.id} style={teamCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <span style={{ ...colorDotStyle, backgroundColor: team.color ?? '#999' }} />
                <strong>{team.name}</strong>
              </div>
              {team.memberIds.length === 0 && (
                <p style={pageStyles.empty}>Nog geen leden.</p>
              )}
              {team.memberIds.length > 0 && (
                <ul style={{ margin: 'var(--spacing-sm) 0 0', paddingLeft: 'var(--spacing-lg)' }}>
                  {team.memberIds.map((id) => (
                    <li key={id} style={{ marginBottom: 4 }}>
                      {userName(id)}{' '}
                      <button
                        type="button"
                        style={removeLinkStyle}
                        onClick={() => handleRemoveMember(team, id)}
                      >
                        verwijderen
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const memberListStyle: React.CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--spacing-md)',
  maxHeight: 200,
  overflowY: 'auto',
};

const memberRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--spacing-sm)',
  fontSize: 14,
  padding: 'var(--spacing-xs) 0',
};

const teamCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--spacing-lg)',
};

const colorDotStyle: React.CSSProperties = {
  width: 14,
  height: 14,
  borderRadius: '50%',
  display: 'inline-block',
};

const removeLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--color-error)',
  fontSize: 12,
  cursor: 'pointer',
  padding: 0,
};
