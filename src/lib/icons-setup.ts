/**
 * Icon registry setup — import this file to pre-register the Lucide icons used in this app.
 * Runs synchronously at module load time (no CDN fetch, no delays).
 *
 * HOW TO ADD A NEW ICON:
 *   1. Add the icon name to USED_ICONS below
 *   2. Use <Icon name="icon-name" /> anywhere in the app
 *
 * The full @iconify-json/lucide package is imported once here; bundlers will
 * include the whole icons.json (~400 KB gzipped) in the bundle. If bundle size
 * becomes critical, switch to individual SVG strings defined inline.
 */

import { addCollection } from '@iconify/react';
import lucideData from '@iconify-json/lucide/icons.json';

type RawIcons = Record<string, { body: string; width?: number; height?: number }>;

// Explicitly list every icon used in the project — keeps intent clear.
const USED_ICONS = [
  'layout-dashboard',
  'school',
  'users',
  'user',
  'clipboard-list',
  'qr-code',
  'settings',
  'plus',
  'arrow-left',
  'check',
  'x',
  'book-open',
  'camera',
  'printer',
  'pencil',
  'bar-chart-2',
  'wifi-off',
  'check-circle-2',
  'alert-circle',
  'search',
  'frown',
  'graduation-cap',
  'hand',
  'zap',
  'pen-line',
  'loader-2',
  'refresh-cw',
  'door-open',
] as const;

const rawIcons = (lucideData as unknown as { icons: RawIcons }).icons;

const subset: RawIcons = {};
for (const name of USED_ICONS) {
  if (rawIcons[name]) subset[name] = rawIcons[name];
}

addCollection({
  prefix: 'lucide',
  icons: subset,
  width: 24,
  height: 24,
});
