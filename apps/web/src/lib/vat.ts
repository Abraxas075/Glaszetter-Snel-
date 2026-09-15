export const parseVatRate = (value: string): number | null => {
  const normalized = value.trim().replace(',', '.');
  if (normalized === '') return null;
  const rate = Number(normalized);
  return Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : null;
};
