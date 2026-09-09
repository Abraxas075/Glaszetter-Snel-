export const pageStyles: Record<string, React.CSSProperties> = {
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--spacing-xl)',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
  },
  empty: {
    color: 'var(--color-text-secondary)',
  },
  error: {
    color: 'var(--color-error)',
    marginBottom: 'var(--spacing-md)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: 'var(--spacing-md)',
    borderBottom: '2px solid var(--color-border)',
    color: 'var(--color-text-secondary)',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  td: {
    padding: 'var(--spacing-md)',
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  },
  tdLink: {
    color: 'var(--color-primary)',
    fontWeight: 600,
  },
  primaryButton: {
    padding: 'var(--spacing-sm) var(--spacing-lg)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-background)',
    fontSize: 14,
    fontWeight: 600,
  },
  backLink: {
    display: 'inline-block',
    marginBottom: 'var(--spacing-lg)',
    fontSize: 14,
  },
};

export const formStyles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-xl)',
    maxWidth: 480,
    marginBottom: 'var(--spacing-xl)',
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginTop: 'var(--spacing-md)',
    marginBottom: 'var(--spacing-xs)',
  },
  input: {
    width: '100%',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-md)',
    fontSize: 15,
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-text-primary)',
  },
  select: {
    width: '100%',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-md)',
    fontSize: 15,
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-text-primary)',
  },
  submitButton: {
    marginTop: 'var(--spacing-xl)',
    padding: 'var(--spacing-md) var(--spacing-xl)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-background)',
    fontSize: 15,
    fontWeight: 600,
  },
};
