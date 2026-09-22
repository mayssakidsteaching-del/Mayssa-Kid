export interface TagConfig {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const PRESET_TAGS: TagConfig[] = [
  {
    id: 'research',
    name: '#research',
    color: '#60a5fa', // blue
    bgColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.28)',
  },
  {
    id: 'code',
    name: '#code',
    color: '#34d399', // emerald
    bgColor: 'rgba(52, 211, 153, 0.12)',
    borderColor: 'rgba(52, 211, 153, 0.28)',
  },
  {
    id: 'creative',
    name: '#creative',
    color: '#f472b6', // pink
    bgColor: 'rgba(244, 114, 182, 0.12)',
    borderColor: 'rgba(244, 114, 182, 0.28)',
  },
  {
    id: 'strategy',
    name: '#strategy',
    color: '#fbbf24', // amber
    bgColor: 'rgba(251, 191, 36, 0.12)',
    borderColor: 'rgba(251, 191, 36, 0.28)',
  },
  {
    id: 'analysis',
    name: '#analysis',
    color: '#a78bfa', // purple
    bgColor: 'rgba(167, 139, 250, 0.12)',
    borderColor: 'rgba(167, 139, 250, 0.28)',
  },
  {
    id: 'writing',
    name: '#writing',
    color: '#38bdf8', // sky
    bgColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.28)',
  },
  {
    id: 'ideas',
    name: '#ideas',
    color: '#f97316', // orange
    bgColor: 'rgba(249, 115, 22, 0.12)',
    borderColor: 'rgba(249, 115, 22, 0.28)',
  },
  {
    id: 'philosophy',
    name: '#philosophy',
    color: '#e2e8f0', // slate/white
    bgColor: 'rgba(226, 232, 240, 0.1)',
    borderColor: 'rgba(226, 232, 240, 0.2)',
  },
];

// Color palette for arbitrary custom tags
const CUSTOM_TAG_PALETTE = [
  { color: '#818cf8', bgColor: 'rgba(129, 140, 248, 0.12)', borderColor: 'rgba(129, 140, 248, 0.28)' },
  { color: '#2dd4bf', bgColor: 'rgba(45, 212, 191, 0.12)', borderColor: 'rgba(45, 212, 191, 0.28)' },
  { color: '#fb7185', bgColor: 'rgba(251, 113, 133, 0.12)', borderColor: 'rgba(251, 113, 133, 0.28)' },
  { color: '#c084fc', bgColor: 'rgba(192, 132, 252, 0.12)', borderColor: 'rgba(192, 132, 252, 0.28)' },
  { color: '#facc15', bgColor: 'rgba(250, 204, 21, 0.12)', borderColor: 'rgba(250, 204, 21, 0.28)' },
];

export function getTagStyle(rawTag: string): { color: string; bgColor: string; borderColor: string } {
  const normalized = normalizeTag(rawTag).toLowerCase();
  const found = PRESET_TAGS.find((p) => p.name.toLowerCase() === normalized || p.id === normalized.replace(/^#/, ''));
  if (found) {
    return { color: found.color, bgColor: found.bgColor, borderColor: found.borderColor };
  }

  // Hash custom tag to pick a stable color
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CUSTOM_TAG_PALETTE.length;
  return CUSTOM_TAG_PALETTE[index];
}

export function normalizeTag(tag: string): string {
  const cleaned = tag.trim().replace(/\s+/g, '-').replace(/^#+/, '');
  return cleaned ? `#${cleaned}` : '';
}
