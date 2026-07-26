import { motion } from 'framer-motion';
import { ImageIcon, Shield, Zap } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function Header() {
  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="flex items-center justify-center w-10 h-10 bg-primary-600 rounded-lg">
              <ImageIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Image Compressor</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">Secure & Fast</p>
            </div>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden md:flex items-center gap-6 text-sm"
          >
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Shield className="w-4 h-4 text-green-500" />
              <span>Privacy First</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span>Lightning Fast</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <ImageIcon className="w-4 h-4 text-blue-500" />
              <span>Multiple Formats</span>
            </div>
          </motion.div>

          {/* Theme + mobile menu */}
          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Menu">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <div className="hidden md:block">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
