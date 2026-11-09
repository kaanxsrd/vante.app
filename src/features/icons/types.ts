export interface IconData {
  body: string;
  viewBox: string;
  light?: string;
  dark?: string;
}

export type IconMap = Record<string, IconData>;

export interface IconResult {
  id: string;
  title: string;
  data: IconData;
}

export const ICON_SETS = [
  { id: 'simple-icons', label: 'Brands' },
  { id: 'logos', label: 'Color logos' },
  { id: 'devicon', label: 'Developer' },
  { id: 'skill-icons', label: 'Tiles' },
  { id: 'fa6-brands', label: 'Social' },
  { id: 'lucide', label: 'General' },
] as const;

export type IconSetId = (typeof ICON_SETS)[number]['id'];

export const ICON_PURPOSES = ['tech', 'social', 'menu'] as const;
export type IconPurpose = (typeof ICON_PURPOSES)[number];

export const DEFAULT_ICONS: Record<IconPurpose, string> = {
  tech: 'lucide:code',
  social: 'lucide:globe',
  menu: 'lucide:link',
};
