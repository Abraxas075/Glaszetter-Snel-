import type { Job, PaginatedResponse } from './types';
export type OrderJobStatus = 'ordered' | 'delivery_expected';
export const ORDER_JOB_LABELS: Record<OrderJobStatus, string> = { ordered: 'Besteld', delivery_expected: 'Levering verwacht' };
export function isOrderJob(job: Job): boolean { return job.status === 'ordered' || job.status === 'delivery_expected'; }
export async function loadOrderJobs(fetchPage: (page: number) => Promise<PaginatedResponse<Job>>): Promise<Job[]> {
  const jobs = new Map<string, Job>();
  let page = 1;
  while (true) {
    const result = await fetchPage(page);
    if (result.page !== page) throw new Error('De lijst kon niet volledig worden geladen.');
    for (const job of result.data) if (isOrderJob(job)) jobs.set(job.id, job);
    if (page >= result.totalPages) return [...jobs.values()];
    page++;
  }
}

export interface OrderDetailsInput { supplierName?: string | null; deliveryDate?: string | null; }
export function normalizeOrderDetails(input: OrderDetailsInput): OrderDetailsInput {
  const result: OrderDetailsInput = {};
  if (input.supplierName !== undefined) {
    if (input.supplierName !== null && (typeof input.supplierName !== 'string' || input.supplierName.length > 200 || /[\u0000-\u001f\u007f\ud800-\udfff]/u.test(input.supplierName))) {
      throw new Error('Vul een leverancier in van maximaal 200 tekens, zonder ongeldige tekens.');
    }
    result.supplierName = input.supplierName?.trim() || null;
  }
  if (input.deliveryDate !== undefined) {
    const date = input.deliveryDate;
    if (date !== null && date !== '') {
      if (typeof date !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date) || date < '0001-01-01' || date > '9999-12-31') throw new Error('Vul een geldige leverdatum in.');
      const parsed = new Date(date + 'T00:00:00Z');
      if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error('Vul een geldige leverdatum in.');
    }
    result.deliveryDate = date || null;
  }
  return result;
}
export function formatDeliveryDate(date?: string): string {
  return date ? date.split('-').reverse().join('-') : 'Nog niet ingevuld';
}
/** Accept the familiar Dutch format in the APK; API storage remains YYYY-MM-DD. */
export function parseDutchDeliveryDate(value: string): string | null {
  if (!value.trim()) return null;
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());
  if (!match) throw new Error('Vul de leverdatum in als DD-MM-JJJJ, bijvoorbeeld 21-10-2026.');
  return normalizeOrderDetails({ deliveryDate: `${match[3]}-${match[2]}-${match[1]}` }).deliveryDate!;
}
