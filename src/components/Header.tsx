'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Github, ImageIcon, Menu, Shield, Sparkles, X } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

type NavItem = {
  label: string;
  href: string;
  /** Pathname that marks this item as active (defaults to `href`). */
  match?: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Compress', href: '/#compress', match: '/' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
];

const GITHUB_URL = 'https://github.com/AbhinayYendoti/Image-compressor';

export default function Header() {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Elevate the bar once the page leaves the top so it separates from content.
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile sheet on navigation.
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Escape closes the sheet; lock background scroll while it is open.
  useEffect(() => {
    if (!isMenuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMenuOpen]);

  const isActive = (item: NavItem) => pathname === (item.match ?? item.href);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'border-b border-gray-200/80 bg-white/80 shadow-sm backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/80'
          : 'border-b border-transparent bg-white/60 backdrop-blur-md dark:bg-gray-900/60'
      }`}
    >
      <a
        href="#compress"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to compressor
      </a>

      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand */}
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
            aria-label="Image Compressor — home"
          >
            <motion.span
              whileHover={prefersReducedMotion ? undefined : { rotate: -6, scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700 shadow-lg shadow-primary-600/25"
            >
              <ImageIcon className="h-5 w-5 text-white" aria-hidden />
              <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/25" />
            </motion.span>

            <span className="flex flex-col leading-none">
              <span className="text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-50">
                Image Compressor
              </span>
              <span className="mt-1 hidden text-[11px] font-medium tracking-wide text-gray-500 sm:block dark:text-gray-400">
                Private · In-browser · Free
              </span>
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav aria-label="Main" className="hidden md:flex md:items-center md:gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
                    active
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active-pill"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      className="absolute inset-0 -z-10 rounded-lg bg-gray-100 dark:bg-gray-800"
                    />
                  )}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop actions */}
          <div className="hidden items-center gap-2 md:flex">
            <span className="mr-1 hidden items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-[11px] font-medium text-green-700 lg:inline-flex dark:text-green-400">
              <Shield className="h-3.5 w-3.5" aria-hidden />
              No uploads
            </span>

            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-2 text-gray-600 outline-none transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-label="View source on GitHub"
            >
              <Github className="h-5 w-5" aria-hidden />
            </a>

            <ThemeToggle />

            <span className="mx-1 h-6 w-px bg-gray-200 dark:bg-gray-700" aria-hidden />

            <Link
              href="/#compress"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary-600/20 outline-none transition-all hover:shadow-lg hover:shadow-primary-600/30 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 active:scale-[0.98] dark:focus-visible:ring-offset-gray-900"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Compress now
            </Link>
          </div>

          {/* Mobile actions */}
          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              className="rounded-lg p-2 text-gray-600 outline-none transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
            >
              <span className="relative block h-6 w-6">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={isMenuOpen ? 'close' : 'open'}
                    initial={{ opacity: 0, rotate: -90, scale: 0.7 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 90, scale: 0.7 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    {isMenuOpen ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
                  </motion.span>
                </AnimatePresence>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sheet */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-x-0 bottom-0 top-16 z-40 bg-gray-900/20 backdrop-blur-sm md:hidden dark:bg-black/40"
              aria-hidden
            />

            <motion.nav
              id="mobile-menu"
              aria-label="Mobile"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute inset-x-0 top-16 z-50 border-b border-gray-200 bg-white px-4 pb-5 pt-3 shadow-xl md:hidden dark:border-gray-800 dark:bg-gray-900"
            >
              <ul className="flex flex-col gap-1">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(item);
                  return (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={`block rounded-lg px-3 py-3 text-base font-medium transition-colors ${
                          active
                            ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <Link
                href="/#compress"
                className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary-600/20"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                Compress now
              </Link>

              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <Github className="h-4 w-4" aria-hidden />
                View on GitHub
              </a>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
