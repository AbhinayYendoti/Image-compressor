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

  // Deepen the tint and lift the bar once the page leaves the top.
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
    <header className="sticky top-0 z-50 pt-3 sm:pt-4">
      {/* Soft wash so content scrolling through the gap above the pill stays muted */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[calc(100%+1.5rem)] bg-gradient-to-b from-primary-50 via-primary-50/70 to-transparent dark:from-gray-900 dark:via-gray-900/70"
        aria-hidden
      />

      <a
        href="#compress"
        className="sr-only focus:not-sr-only focus:absolute focus:left-8 focus:top-6 focus:z-[60] focus:rounded-full focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to compressor
      </a>

      <div className="container mx-auto max-w-7xl px-4">
        {/* Floating pill bar */}
        <div
          className={`relative z-50 flex h-16 items-center justify-between gap-4 rounded-full border pl-4 pr-3 backdrop-blur-xl transition-all duration-300 sm:pl-5 sm:pr-4 ${
            isScrolled
              ? 'border-primary-200/70 bg-gradient-to-r from-primary-100/90 via-white/85 to-primary-50/90 shadow-[0_14px_40px_-14px_rgba(2,132,199,0.45)] dark:border-gray-700/70 dark:from-gray-900/85 dark:via-gray-900/75 dark:to-gray-800/85 dark:shadow-[0_14px_40px_-14px_rgba(0,0,0,0.6)]'
              : 'border-white/70 bg-gradient-to-r from-primary-50/75 via-white/65 to-primary-100/65 shadow-[0_10px_30px_-16px_rgba(2,132,199,0.35)] dark:border-gray-800/70 dark:from-gray-900/70 dark:via-gray-900/55 dark:to-gray-800/70 dark:shadow-none'
          }`}
        >
          {/* Inner highlight keeps the glass edge crisp on light backgrounds */}
          <span
            className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/50 dark:ring-white/5"
            aria-hidden
          />

          {/* Brand */}
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-3 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-50 dark:focus-visible:ring-offset-gray-900"
            aria-label="Image Compressor — home"
          >
            <motion.span
              whileHover={prefersReducedMotion ? undefined : { rotate: -6, scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-300 via-primary-500 to-primary-600 shadow-md shadow-primary-500/30"
            >
              <ImageIcon className="h-5 w-5 text-white" aria-hidden />
              <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/40" />
            </motion.span>

            <span className="flex flex-col leading-none">
              <span className="text-[15px] font-semibold tracking-tight text-primary-900 dark:text-gray-50">
                Image Compressor
              </span>
              <span className="mt-1 hidden text-[11px] font-medium tracking-wide text-primary-700/70 sm:block dark:text-gray-400">
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
                  className={`relative rounded-full px-4 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-50 dark:focus-visible:ring-offset-gray-900 ${
                    active
                      ? 'text-primary-800 dark:text-white'
                      : 'text-primary-700/70 hover:text-primary-800 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active-pill"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      className="absolute inset-0 -z-10 rounded-full bg-white/80 shadow-sm ring-1 ring-primary-200/70 dark:bg-gray-800 dark:ring-gray-700"
                    />
                  )}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop actions */}
          <div className="hidden items-center gap-2 md:flex">
            <span className="mr-1 hidden items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-700 lg:inline-flex dark:text-emerald-400">
              <Shield className="h-3.5 w-3.5" aria-hidden />
              No uploads
            </span>

            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full p-2 text-primary-700/70 outline-none transition-colors hover:bg-white/70 hover:text-primary-800 focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-label="View source on GitHub"
            >
              <Github className="h-5 w-5" aria-hidden />
            </a>

            <ThemeToggle />

            <span className="mx-1 h-6 w-px bg-primary-200/70 dark:bg-gray-700" aria-hidden />

            <Link
              href="/#compress"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary-400 to-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary-500/25 outline-none transition-all hover:shadow-lg hover:shadow-primary-500/35 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-50 active:scale-[0.98] dark:focus-visible:ring-offset-gray-900"
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
              className="rounded-full p-2 text-primary-700/80 outline-none transition-colors hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-800"
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
              className="fixed inset-0 z-40 bg-primary-900/15 backdrop-blur-sm md:hidden dark:bg-black/40"
              aria-hidden
            />

            <motion.nav
              id="mobile-menu"
              aria-label="Mobile"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute inset-x-4 top-full z-50 mt-2 rounded-3xl border border-primary-200/70 bg-gradient-to-b from-white/95 to-primary-50/95 p-3 shadow-[0_20px_50px_-20px_rgba(2,132,199,0.55)] backdrop-blur-xl md:hidden dark:border-gray-700/70 dark:from-gray-900/95 dark:to-gray-900/95 dark:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)]"
            >
              <ul className="flex flex-col gap-1">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(item);
                  return (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={`block rounded-2xl px-4 py-3 text-base font-medium transition-colors ${
                          active
                            ? 'bg-white text-primary-800 shadow-sm ring-1 ring-primary-200/70 dark:bg-gray-800 dark:text-white dark:ring-gray-700'
                            : 'text-primary-700/80 hover:bg-white/70 hover:text-primary-800 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
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
                className="mt-4 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-400 to-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary-500/25"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                Compress now
              </Link>

              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-full border border-primary-200/70 px-4 py-3 text-sm font-medium text-primary-700/80 transition-colors hover:bg-white/70 hover:text-primary-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
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
