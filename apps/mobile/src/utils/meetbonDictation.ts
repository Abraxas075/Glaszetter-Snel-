export type DictationKind = 'text' | 'dimension' | 'quantity';

// Keep recognition separate from applying a value: the user confirms the result first.
export function dictationValue(transcript: string, kind: DictationKind): string {
  const value = transcript.trim();
  if (!value) throw new Error('Spreek eerst iets in of vul de herkende tekst aan.');
  if (value.length > 2000) throw new Error('Gebruik maximaal 2000 tekens per veld.');
  if (kind === 'text') return value;

  const words: Record<string, string> = { een: '1', één: '1', twee: '2', drie: '3', vier: '4', vijf: '5', zes: '6', zeven: '7', acht: '8', negen: '9', tien: '10', elf: '11', twaalf: '12' };
  let number = value.toLowerCase();
  if (kind === 'dimension') number = number.replace(/\s*(?:millimeter|millimeters|mm)\.?$/, '').trim();
  number = words[number] ?? number;
  if (/^\d{1,3}(?:[. ]\d{3})+(?:,\d+)?$/.test(number)) number = number.replace(/[. ]/g, '');
  if (!/^\d+(?:[.,]\d+)?$/.test(number)) throw new Error('Controleer de waarde. Gebruik één getal; glasmaten zijn in mm.');
  const parsed = Number(number.replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > Number.MAX_SAFE_INTEGER) throw new Error('Gebruik een geldig getal groter dan nul.');
  if (kind === 'quantity' && !Number.isSafeInteger(parsed)) throw new Error('Vul een heel aantal ruiten in.');
  return String(parsed);
}
