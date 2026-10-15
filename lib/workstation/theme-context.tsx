'use client';

/**
 * Light/dark switch for the AE Workstation and C-panel.
 *
 * The app-wide ThemeProvider (app/components/common/ThemeProvider, mounted in
 * the root layout) owns the theme. This used to be a separate provider that
 * was never mounted, so its toggle did nothing; it now reads and sets the
 * app-wide theme, which the anti-flash script in the root layout restores.
 */

import { useTheme as useAppTheme } from '@/app/components/common/ThemeProvider';

export function useTheme(): { dark: boolean; toggle: () => void } {
  const { resolvedTheme, setTheme } = useAppTheme();
  const dark = resolvedTheme === 'dark';
  return { dark, toggle: () => setTheme(dark ? 'light' : 'dark') };
}
