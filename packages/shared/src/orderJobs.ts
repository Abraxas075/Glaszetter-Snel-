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
