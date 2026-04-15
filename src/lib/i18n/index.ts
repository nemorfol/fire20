export type Locale = 'it' | 'en';

export const locales: { code: Locale; label: string; flag: string }[] = [
  { code: 'it', label: 'Italiano', flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'en', label: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
];
