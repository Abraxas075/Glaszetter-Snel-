import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseVatRate } from '../apps/web/src/lib/vat';
import { updateQuote } from '../apps/web/src/lib/quotes';
import { updateInvoice } from '../apps/web/src/lib/invoices';

test('accepts zero and decimal VAT rates, rejects empty and invalid values', () => {
  for (const [input, expected] of [
    ['0', 0],
    ['0,00', 0],
    ['9', 9],
    ['21', 21],
    ['9,5', 9.5],
    ['100', 100],
  ] as const) {
    assert.equal(parseVatRate(input), expected);
  }
  for (const input of ['', ' ', 'abc', '21abc', '-1', '101', 'Infinity']) {
    assert.equal(parseVatRate(input), null);
  }
});

for (const [kind, update] of [
  ['quotes', updateQuote],
  ['invoices', updateInvoice],
] as const) {
  test(`${kind} sends an explicit zero VAT rate to the API`, async (context) => {
    const requests: { path: string; method?: string; body: unknown }[] = [];
    context.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
      const body = JSON.parse(String(options.body));
      requests.push({ path: new URL(url).pathname, method: options.method, body });
      return new Response(JSON.stringify({ success: true, data: { id: 'test', ...body } }), {
        headers: { 'Content-Type': 'application/json' },
      });
    });
    const rate = parseVatRate('0');
    assert.notEqual(rate, null);
    const result = await update('test', { vatRate: rate! });
    assert.equal(result.vatRate, 0);
    assert.deepEqual(requests, [
      { path: `/api/v1/${kind}/test`, method: 'PATCH', body: { vatRate: 0 } },
    ]);
  });
}
