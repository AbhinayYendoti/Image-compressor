'use client';

import { useEffect } from 'react';
import { useTheme } from '@/components/ThemeProvider';

const THEME_COLOR_LIGHT = '#0ea5e9';
const THEME_COLOR_DARK = '#111827';

export default function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const content = resolvedTheme === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  }, [resolvedTheme]);

  return null;
}
