// scheduled_date is a PostgreSQL DATE, not a timestamp. Never filter it with UTC instants.
export function localDateKey(now = new Date()) {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}
export function scheduledDateKey(value: Date | string) {
  return typeof value === 'string' ? value.slice(0, 10) : localDateKey(value);
}
export function dayRange(now = new Date()) {
  const day = localDateKey(now);
  return { from: day, to: day };
}
