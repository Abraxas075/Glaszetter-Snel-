export const GLASS_THICKNESS_OPTIONS = ['3 mm', '4 mm', '5 mm', '6 mm', '8 mm', '10 mm', '12 mm', '15 mm', '19 mm'] as const;

export const HR_GLASS_BUILDUP_OPTIONS = [
  '4-12-4', '4-14-4', '4-15-4', '4-16-4', '4-18-4', '4-20-4',
  '5-12-4', '5-14-4', '5-15-4', '5-16-4', '5-18-4', '5-20-4',
  '6-12-4', '6-14-4', '6-15-4', '6-16-4', '6-18-4', '6-20-4',
  '6-12-6', '6-14-6', '6-15-6', '6-16-6', '6-18-6', '6-20-6',
  '8-12-4', '8-16-4', '8-20-4', '8-12-6', '8-16-6', '8-20-6',
] as const;

export const TRIPLE_GLASS_BUILDUP_OPTIONS = [
  '4-10-4-10-4', '4-12-4-12-4', '4-14-4-14-4', '4-16-4-16-4',
  '6-12-4-12-4', '6-16-4-16-4',
] as const;

export function getGlassThicknessOptions(glassType: string): readonly string[] {
  if (/triple|hr\s*\+\s*\+\s*\+/i.test(glassType)) return TRIPLE_GLASS_BUILDUP_OPTIONS;
  if (/dubbel|hr/i.test(glassType)) return HR_GLASS_BUILDUP_OPTIONS;
  return GLASS_THICKNESS_OPTIONS;
}
