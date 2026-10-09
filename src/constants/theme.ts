import { Platform } from 'react-native';

// One deliberate look: a living room at night with a warm lamp left on.
export const Colors = {
  night: '#14121f',
  sofa: '#1e1b2e',
  cushion: '#2a2640',
  line: '#37324f',
  lamp: '#f2b25c',
  lampInk: '#2a1a05',
  text: '#ece9f5',
  muted: '#a29db8',
  ok: '#7fd1a8',
  warn: '#f2b25c',
  end: '#e58a8a',
  info: '#8fb4f2',
  // One color per household member, in join order.
  members: ['#8fb4f2', '#e9a3c9', '#7fd1a8', '#c6a7f2'],
} as const;

export const Fonts = {
  display: Platform.select({ ios: 'ui-rounded', web: 'ui-rounded, system-ui, sans-serif', default: 'sans-serif' }),
  mono: Platform.select({ ios: 'ui-monospace', web: 'ui-monospace, Menlo, monospace', default: 'monospace' }),
};

export const Spacing = {
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
} as const;

export const Radius = { small: 8, medium: 12, large: 20 } as const;

export const MaxContentWidth = 640;
