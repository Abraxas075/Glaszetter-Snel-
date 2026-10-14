import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadOrderJobs } from '../packages/shared/src/orderJobs';
import type { Job, PaginatedResponse } from '../packages/shared/src/types';
const job = (id: string, status: Job['status']) => ({id,status,name:id} as Job);
const page = (number: number, jobs: Job[], totalPages = 2): PaginatedResponse<Job> => ({page:number,data:jobs,limit:100,total:101,totalPages});
test('orders beyond the first 100 jobs are included and non-order statuses excluded', async () => {
 const requests: number[] = [];
 const result = await loadOrderJobs(async number => {
  requests.push(number);
  return number===1 ? page(1,Array.from({length:100},(_,i)=>job(String(i),'completed'))) : page(2,[job('ordered-later','ordered'),job('delivery','delivery_expected'),job('approved','approved')]);
 });
 assert.deepEqual(requests,[1,2]); assert.deepEqual(result.map(j=>j.id),['ordered-later','delivery']);
});
test('failed later pages do not present a partial order list as success', async () => {
 await assert.rejects(loadOrderJobs(async number => { if(number===2) throw new Error('offline'); return page(1,[job('first','ordered')]); }), /offline/);
});
test('empty lists finish and duplicate IDs are shown once', async () => {
 assert.deepEqual(await loadOrderJobs(async () => page(1,[],0)),[]);
 const result = await loadOrderJobs(async number => page(number,[job('same','ordered')])); assert.equal(result.length,1);
 await assert.rejects(loadOrderJobs(async () => page(0,[])), /niet volledig/);
});

test('Dutch calendar input validates leap days and round-trips without a timezone', async () => {
 const { parseDutchDeliveryDate, formatDeliveryDate, normalizeOrderDetails } = await import('../packages/shared/src/orderJobs');
 assert.equal(parseDutchDeliveryDate('25-10-2026'), '2026-10-25');
 assert.equal(formatDeliveryDate('2026-10-25'), '25-10-2026');
 assert.equal(parseDutchDeliveryDate('29-02-2028'), '2028-02-29');
 assert.equal(parseDutchDeliveryDate(' '), null);
 assert.throws(() => parseDutchDeliveryDate('29-02-2026'));
 assert.throws(() => parseDutchDeliveryDate('2026-10-25'));
 assert.deepEqual(normalizeOrderDetails({supplierName:'  Glas Noord  '}), {supplierName:'Glas Noord'});
 assert.deepEqual(normalizeOrderDetails({}), {});
});
