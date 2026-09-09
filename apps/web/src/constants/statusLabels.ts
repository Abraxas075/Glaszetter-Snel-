import type { InvoiceStatus, JobStatus, ProjectStatus, QuoteStatus, UserRole } from '@glaszetter/shared';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  concept: 'Concept',
  active: 'Actief',
  completed: 'Afgerond',
  archived: 'Gearchiveerd',
};

export const PROJECT_STATUSES = Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  concept: 'Concept',
  measuring: 'Inmeten',
  quote: 'Offerte',
  approved: 'Goedgekeurd',
  ordered: 'Besteld',
  delivery_expected: 'Levering verwacht',
  scheduled: 'Ingepland',
  in_progress: 'In uitvoering',
  completion: 'Oplevering',
  completed: 'Afgerond',
  invoiced: 'Gefactureerd',
};

export const JOB_STATUSES = Object.keys(JOB_STATUS_LABELS) as JobStatus[];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Eigenaar',
  admin: 'Beheerder',
  planner: 'Planner',
  inmeter: 'Inmeter',
  glaszetter: 'Glaszetter',
  warehouse: 'Magazijn',
  external: 'Extern',
};

export const USER_ROLES = Object.keys(USER_ROLE_LABELS) as UserRole[];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  concept: 'Concept',
  sent: 'Verstuurd',
  approved: 'Goedgekeurd',
  rejected: 'Afgewezen',
  expired: 'Verlopen',
};

export const QUOTE_STATUSES = Object.keys(QUOTE_STATUS_LABELS) as QuoteStatus[];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  concept: 'Concept',
  sent: 'Verstuurd',
  paid: 'Betaald',
  overdue: 'Achterstallig',
};

export const INVOICE_STATUSES = Object.keys(INVOICE_STATUS_LABELS) as InvoiceStatus[];
