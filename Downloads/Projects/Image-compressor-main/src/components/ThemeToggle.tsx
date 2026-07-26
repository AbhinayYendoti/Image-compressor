'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import type { ThemePreference } from '@/lib/theme';

const CYCLE_ORDER: ThemePreference[] = ['light', 'dark', 'auto'];

const cycleLabel: Record<ThemePreference, string> = {
  light: 'Switch to dark mode',
  dark: 'Switch to system theme',
  auto: 'Switch to light mode',
};

const modeTitle: Record<ThemePreference, string> = {
  light: 'Light mode',
  dark: 'Dark mode',
  auto: 'System theme',
};

function ThemeIcon({ theme }: { theme: ThemePreference }) {
  if (theme === 'dark') {
    return <Moon className="w-5 h-5" aria-hidden />;
  }
  if (theme === 'auto') {
    return <Monitor className="w-5 h-5" aria-hidden />;
  }
  return <Sun className="w-5 h-5" aria-hidden />;
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const handleClick = () => {
    const index = CYCLE_ORDER.indexOf(theme);
    const next = CYCLE_ORDER[(index + 1) % CYCLE_ORDER.length];
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900"
      aria-label={cycleLabel[theme]}
      title={modeTitle[theme]}
    >
      <ThemeIcon theme={theme} />
    </button>
  );
}
