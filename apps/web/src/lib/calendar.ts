export const startOfWeek = (date: Date): Date => {
  const start = new Date(date);
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Calendar cells are local dates, so converting them to UTC can change the day.
export const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// scheduledDate represents a calendar date, including when the API serializes
// it as an ISO timestamp. Do not shift it to the browser's time zone.
export const scheduledDateKey = (date: Date | string): string =>
  (typeof date === 'string' ? date : date.toISOString()).slice(0, 10);
