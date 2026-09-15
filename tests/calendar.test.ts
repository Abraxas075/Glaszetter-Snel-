import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDays, scheduledDateKey, startOfWeek, toDateKey } from '../apps/web/src/lib/calendar';

for (const timezone of ['Europe/Amsterdam', 'America/Los_Angeles', 'Pacific/Auckland', 'UTC']) {
  test(`planning keeps calendar dates in ${timezone}`, () => {
    const previousTimezone = process.env.TZ;
    process.env.TZ = timezone;
    try {
      for (const [today, monday, sunday] of [
        ['2026-09-15', '2026-09-14', '2026-09-20'],
        ['2026-03-29', '2026-03-23', '2026-03-29'],
        ['2026-10-25', '2026-10-19', '2026-10-25'],
        ['2026-01-01', '2025-12-29', '2026-01-04'],
      ]) {
        const weekStart = startOfWeek(new Date(`${today}T12:00:00`));
        const weekEnd = addDays(weekStart, 6);
        assert.equal(toDateKey(weekStart), monday);
        assert.equal(toDateKey(weekEnd), sunday);
        assert.equal(weekStart.getHours(), 0);
        assert.equal(weekEnd.getHours(), 0);

        for (const date of [monday, sunday]) {
          const cells = Array.from({ length: 7 }, (_, index) =>
            toDateKey(addDays(weekStart, index))
          );
          assert.equal(
            cells.filter((key) => key === scheduledDateKey(`${date}T00:00:00.000Z`)).length,
            1
          );
          assert.equal(scheduledDateKey(date), date);
        }
      }
    } finally {
      if (previousTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimezone;
    }
  });
}
