export const sapphire = {
  background: '#06182E',
  glass: '#0B2942',
  edge: '#8DCAC7',
  inner: '#26556B',
  blue: '#00A0E6',
  red: '#E30613',
  text: '#F3F7FC',
  muted: '#A8C4D8',
  onPrimary: '#06182E',
  onAccent: '#FFFFFF',
  error: '#FF8290',
  selected: '#103A58',
  ownBorder: '#197BA8',
  reflection: 'rgba(180,225,240,0.06)',
  actionText: '#F3F7FC',
  link: '#00A0E6',
};
export type SapphirePalette = { [Key in keyof typeof sapphire]: string };
export type AppTheme = 'dark' | 'light';
export const lightSapphire: SapphirePalette = {
  background: '#F7FAFD',
  glass: '#F0F8FD',
  edge: '#97D9FA',
  inner: '#BDE7FB',
  blue: '#00A0E6',
  red: '#E30613',
  text: '#102A43',
  muted: '#486277',
  onPrimary: '#06182E',
  onAccent: '#FFFFFF',
  error: '#B42335',
  selected: '#E5F2FA',
  ownBorder: '#00A0E6',
  reflection: 'rgba(0,107,155,0.04)',
  actionText: '#06182E',
  link: '#00658F',
};
export const themePalettes: Record<AppTheme, SapphirePalette> = {
  dark: sapphire,
  light: lightSapphire,
};
