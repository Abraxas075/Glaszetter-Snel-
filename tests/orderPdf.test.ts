import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import type { OrderPdfInput } from '../packages/api/src/services/orderPdfService';
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
process.env.JWT_SECRET = 'disposable-order-pdf-test-key';
const companyId = '00000000-0000-4000-8000-000000000001';
const otherCompanyId = '00000000-0000-4000-8000-000000000002';
const jobId = '00000000-0000-4000-8000-000000000003';
const unsavedId = '00000000-0000-4000-8000-000000000004';
const projectId = '00000000-0000-4000-8000-000000000005';
const date = new Date('2026-10-14T07:00:00Z');
const input: OrderPdfInput = {
  company: { id: companyId, name: 'Glaszetter Snel', createdAt: date, updatedAt: date },
  project: { id: projectId, companyId, customerId: companyId, name: 'Voorbeeldproject', address: 'Voorbeeldstraat 10', city: 'Heemskerk', status: 'active', createdAt: date, updatedAt: date },
  job: { id: jobId, companyId, projectId, name: 'Voorbeeldklus', status: 'ordered', orderNumber: 'GS-2026-001', supplierName: 'Voorbeeldleverancier', deliveryDate: '2026-10-21', createdAt: date, updatedAt: date },
  data: { fields: {}, checks: {}, lines: [{ quantity: 2, width: 875, height: 484, glassType: 'HR++', notes: 'Woonkamer' }] }, updatedAt: date,
};
let generate: typeof import('../packages/api/src/services/orderPdfService')['generateOrderPdf'];
let db: PGlite;
let pool: typeof import('../packages/api/src/db/pool')['pool'];
let server: ReturnType<ReturnType<typeof import('express')['default']>['listen']>;
let base: string;
let signToken: typeof import('../packages/api/src/services/authService')['signToken'];
before(async () => {
  ({ generateOrderPdf: generate } = await import('../packages/api/src/services/orderPdfService'));
  db = new PGlite();
  await db.exec(`CREATE TABLE companies (id uuid PRIMARY KEY, name text);
    CREATE TABLE projects (id uuid PRIMARY KEY, company_id uuid, customer_id uuid, name text, status text, address text, city text);
    CREATE TABLE jobs (id uuid PRIMARY KEY, company_id uuid, project_id uuid, name text, status text, supplier_name text, delivery_date date, order_number text);
    CREATE TABLE meetbons (job_id uuid PRIMARY KEY, data jsonb, updated_at timestamptz);`);
  await db.query('INSERT INTO companies VALUES ($1,$2)', [companyId, input.company.name]);
  await db.query("INSERT INTO projects VALUES ($1,$2,$2,'Voorbeeldproject','active','Voorbeeldstraat 10','Heemskerk')", [projectId,companyId]);
  await db.query("INSERT INTO jobs VALUES ($1,$2,$3,'Voorbeeldklus','ordered','Voorbeeldleverancier','2026-10-21'),($4,$2,$3,'Zonder bon','ordered',NULL,NULL)",[jobId,companyId,projectId,unsavedId]);
  await db.query("UPDATE jobs SET order_number='GS-2026-001' WHERE id=$1", [jobId]);
  await db.query('INSERT INTO meetbons VALUES ($1,$2,$3)',[jobId,JSON.stringify(input.data),date.toISOString()]);
  ({ pool } = await import('../packages/api/src/db/pool'));
  mock.method(pool,'query',(sql:string,params:unknown[])=>db.query(sql,params));
  ({ signToken } = await import('../packages/api/src/services/authService'));
  const { default: app } = await import('../packages/api/src/app');
  server=app.listen(0); await new Promise<void>(resolve=>server.once('listening',resolve));
  base=`http://127.0.0.1:${(server.address() as any).port}/api/v1`;
});
after(async()=>{ if(server){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}mock.restoreAll();await pool.end();await db.close(); });
async function parse(pdf:Buffer) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const parsed = await getDocument({data:new Uint8Array(pdf),useSystemFonts:true}).promise;
  const texts:string[]=[];
  try {for(let i=1;i<=parsed.numPages;i++){const page=await parsed.getPage(i);const content=await page.getTextContent();texts.push(content.items.map(item=>'str' in item?item.str:'').join(' ').replace(/\s+/g,' '));}}
  finally{await parsed.destroy();}
  return texts;
}
test('order PDF has supplier, calendar date, saved panes, quantity-aware area and logo on a single page',async()=>{
  const pdf=await generate(input,date);const pages=await parse(pdf);
  assert.equal(pdf.subarray(0,5).toString(),'%PDF-'); assert.equal(pages.length,1);
  for(const value of ['BESTELBON','GS-2026-001','Voorbeeldleverancier','21-10-2026','Voorbeeldklus','Voorbeeldproject','Voorbeeldstraat 10','Breedte','Hoogte','875','484','HR++','Woonkamer','2 ruiten | 0,847','Pagina 1 van 1']) assert.ok(pages[0].includes(value),value);
  assert.ok(pdf.toString('latin1').includes('/Subtype /Image'));
});
test('long unbroken pane text continues across pages and every row and quantity remains represented',async()=>{
  const data={...input.data,lines:Array.from({length:200},(_,i)=>({...input.data.lines[0],notes:i===0?'a'.repeat(2000)+' FINISH LONG NOTE':`Regel ${i+1}`}))};
  const pdf=await generate({...input,data},date);const pages=await parse(pdf);const text=pages.join(' ');
  assert.ok(pages.length>5);assert.ok(text.includes('FINISH LONG NOTE'));assert.ok(text.includes('Regel 200'));assert.ok(text.includes('400 ruiten | 169,4'));
  for(let i=0;i<pages.length;i++){assert.ok(pages[i].includes('BESTELBON'));assert.ok(pages[i].includes(`Pagina ${i+1} van ${pages.length}`));}
});
test('order PDF does not invent missing supplier or delivery date and exports only saved pane details',async()=>{
  const pages=await parse(await generate({...input,job:{...input.job,orderNumber:undefined,supplierName:undefined,deliveryDate:undefined}},date));
  assert.ok(pages[0].includes('Bestelnummer: Nog niet ingevuld'));assert.ok(pages[0].includes('Leverancier: Nog niet ingevuld'));assert.ok(pages[0].includes('Verwachte leverdatum: Nog niet ingevuld'));
});
test('HTTP export uses current saved delivery data, enforces authentication and company ownership, rejects empty or invalid panes',async()=>{
  const headers=(companyId:string)=>({Authorization:`Bearer ${signToken({userId:companyId,companyId,role:'glaszetter'})}`});
  const endpoint=`${base}/jobs/${jobId}/order/pdf`;
  assert.equal((await fetch(endpoint)).status,401);
  assert.equal((await fetch(endpoint,{headers:headers(otherCompanyId)})).status,404);
  const empty=await fetch(`${base}/jobs/${unsavedId}/order/pdf`,{headers:headers(companyId)});assert.equal(empty.status,422);assert.equal((await empty.json()).error.code,'ORDER_HAS_NO_LINES');
  await db.query("UPDATE jobs SET order_number='GS-2026-002', supplier_name='Gewijzigde leverancier',delivery_date='2026-10-25' WHERE id=$1",[jobId]);
  const response=await fetch(endpoint,{headers:headers(companyId)});assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/pdf');assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('content-disposition'),'attachment; filename="Bestelbon.pdf"');
  const text=(await parse(Buffer.from(await response.arrayBuffer()))).join(' ');assert.ok(text.includes('GS-2026-002'));assert.ok(text.includes('Gewijzigde leverancier'));assert.ok(text.includes('25-10-2026'));
  assert.deepEqual((await db.query('SELECT data FROM meetbons WHERE job_id=$1',[jobId])).rows[0].data,input.data);
  assert.equal((await db.query('SELECT status FROM jobs WHERE id=$1',[jobId])).rows[0].status,'ordered');
  for(const data of [{fields:{},checks:{},lines:[]},{fields:{},checks:{},lines:[{quantity:1,width:0,height:1,glassType:'',notes:''}]}]){
    await db.query('UPDATE meetbons SET data=$2 WHERE job_id=$1',[jobId,JSON.stringify(data)]);
    assert.equal((await fetch(endpoint,{headers:headers(companyId)})).status,422);
  }
});
