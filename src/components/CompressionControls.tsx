import { motion, AnimatePresence } from 'framer-motion';
import { Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { CompressionSettings, CompressionPreset } from '@/types';

interface CompressionControlsProps {
  settings: CompressionSettings;
  onSettingsChange: (settings: CompressionSettings) => void;
  presets: CompressionPreset[];
  showSettings: boolean;
  onToggleSettings: () => void;
}

export default function CompressionControls({
  settings,
  onSettingsChange,
  presets,
  showSettings,
  onToggleSettings
}: CompressionControlsProps) {
  const handlePresetSelect = (preset: CompressionPreset) => {
    onSettingsChange(preset.settings);
  };

  const handleQualityChange = (quality: number) => {
    onSettingsChange({ ...settings, quality });
  };

  const handleFormatChange = (format: 'jpeg' | 'png' | 'webp') => {
    onSettingsChange({ ...settings, format });
  };

  const handleAspectRatioChange = (maintainAspectRatio: boolean) => {
    onSettingsChange({ ...settings, maintainAspectRatio });
  };

  const handleLosslessChange = (lossless: boolean) => {
    onSettingsChange({ ...settings, lossless });
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Compression Settings</h3>
        <button
          onClick={onToggleSettings}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Toggle advanced settings"
        >
          {showSettings ? (
            <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>

      {/* Presets */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Quick Presets
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset)}
              className={`p-3 text-left rounded-lg border transition-colors ${
                settings.quality === preset.settings.quality &&
                settings.format === preset.settings.format
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="font-medium text-sm">{preset.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Quality Slider */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Quality: {settings.quality}%
          </label>
          <span className="text-xs text-gray-500">
            {settings.quality >= 80 ? 'High' : settings.quality >= 60 ? 'Medium' : 'Low'}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          value={settings.quality}
          onChange={(e) => handleQualityChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>Smaller file</span>
          <span>Better quality</span>
        </div>
      </div>

      {/* Format Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Output Format
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'jpeg' as const, label: 'JPEG', desc: 'Best for photos' },
            { value: 'png' as const, label: 'PNG', desc: 'Lossless quality' },
            { value: 'webp' as const, label: 'WebP', desc: 'Modern format' }
          ].map((format) => (
            <button
              key={format.value}
              onClick={() => handleFormatChange(format.value)}
              className={`p-3 rounded-lg border transition-colors ${
                settings.format === format.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="font-medium text-sm">{format.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{format.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Settings */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4"
          >
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Advanced Settings</h4>
            
            {/* Aspect Ratio */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Maintain Aspect Ratio
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Keep original proportions when resizing
                </p>
              </div>
              <button
                onClick={() => handleAspectRatioChange(!settings.maintainAspectRatio)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.maintainAspectRatio ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.maintainAspectRatio ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Lossless Mode */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Lossless Compression
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No quality loss (PNG/WebP only)
                </p>
              </div>
              <button
                onClick={() => handleLosslessChange(!settings.lossless)}
                disabled={settings.format === 'jpeg'}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.lossless ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'
                } ${settings.format === 'jpeg' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.lossless ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Max Dimensions */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Maximum Dimensions
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Max Width</label>
                  <input
                    type="number"
                    placeholder="Auto"
                    className="input-field text-sm"
                    value={settings.maxWidth || ''}
                    onChange={(e) => onSettingsChange({
                      ...settings,
                      maxWidth: e.target.value ? Number(e.target.value) : undefined
                    })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Max Height</label>
                  <input
                    type="number"
                    placeholder="Auto"
                    className="input-field text-sm"
                    value={settings.maxHeight || ''}
                    onChange={(e) => onSettingsChange({
                      ...settings,
                      maxHeight: e.target.value ? Number(e.target.value) : undefined
                    })}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
