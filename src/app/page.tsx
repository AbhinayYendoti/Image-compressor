'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image as ImageIcon, Download, Settings, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { ImageFile, CompressionSettings } from '@/types';
import { validateFile, formatFileSize, generateUniqueId, createImagePreview, compressImage, COMPRESSION_PRESETS } from '@/utils/compression';
import { downloadSingleFile, downloadBatchAsZip } from '@/utils/download';
import ImageUploader from '@/components/ImageUploader';
import CompressionControls from '@/components/CompressionControls';
import ImagePreview from '@/components/ImagePreview';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function HomePage() {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [settings, setSettings] = useState<CompressionSettings>({
    quality: 75,
    format: 'jpeg',
    maintainAspectRatio: true,
    lossless: false
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: ImageFile[] = [];
    
    for (const file of acceptedFiles) {
      const validation = validateFile(file);
      
      if (!validation.isValid) {
        newFiles.push({
          id: generateUniqueId(),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          error: validation.error,
          isProcessing: false
        });
        continue;
      }

      try {
        const preview = await createImagePreview(file);
        newFiles.push({
          id: generateUniqueId(),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          preview,
          isProcessing: false
        });
      } catch (error) {
        newFiles.push({
          id: generateUniqueId(),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          error: 'Failed to create preview',
          isProcessing: false
        });
      }
    }

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg']
    },
    multiple: true,
    maxSize: 50 * 1024 * 1024 // 50MB
  });

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const compressAllFiles = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    const validFiles = files.filter(file => !file.error);

    for (const file of validFiles) {
      try {
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, isProcessing: true } : f
        ));

        const compressed = await compressImage(file.file, settings);
        
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, compressed, isProcessing: false }
            : f
        ));
      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, error: 'Compression failed', isProcessing: false }
            : f
        ));
      }
    }

    setIsProcessing(false);
  };

  const downloadAll = async () => {
    if (files.length === 1) {
      const file = files[0];
      if (file.compressed) {
        await downloadSingleFile(file.compressed, file.name);
      }
    } else if (files.length > 1) {
      await downloadBatchAsZip(files);
    }
  };

  const clearAll = () => {
    setFiles([]);
  };

  const validFiles = files.filter(file => !file.error);
  const compressedFiles = files.filter(file => file.compressed);
  const hasErrors = files.some(file => file.error);
  const canCompress = validFiles.length > 0 && !isProcessing;
  const canDownload = compressedFiles.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Secure Image Compressor
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Compress your images online with our secure, fast, and privacy-focused tool. 
            No uploads to our servers - everything happens in your browser.
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Upload and Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Area */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <ImageUploader
                getRootProps={getRootProps}
                getInputProps={getInputProps}
                isDragActive={isDragActive}
                files={files}
                onRemoveFile={removeFile}
              />
            </motion.div>

            {/* Compression Controls */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <CompressionControls
                settings={settings}
                onSettingsChange={setSettings}
                presets={COMPRESSION_PRESETS}
                showSettings={showSettings}
                onToggleSettings={() => setShowSettings(!showSettings)}
              />
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <button
                onClick={compressAllFiles}
                disabled={!canCompress}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Compressing...
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-5 w-5" />
                    Compress Images
                  </>
                )}
              </button>

              {canDownload && (
                <button
                  onClick={downloadAll}
                  className="w-full btn-outline flex items-center justify-center gap-2"
                >
                  <Download className="h-5 w-5" />
                  Download {files.length === 1 ? 'Image' : 'All Images'}
                </button>
              )}

              {files.length > 0 && (
                <button
                  onClick={clearAll}
                  className="w-full btn-secondary flex items-center justify-center gap-2"
                >
                  <X className="h-5 w-5" />
                  Clear All
                </button>
              )}
            </motion.div>

            {/* Stats */}
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card"
              >
                <h3 className="font-semibold text-gray-900 mb-3">Statistics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Files:</span>
                    <span className="font-medium">{files.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Original Size:</span>
                    <span className="font-medium">
                      {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
                    </span>
                  </div>
                  {compressedFiles.length > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Compressed Size:</span>
                        <span className="font-medium">
                          {formatFileSize(compressedFiles.reduce((sum, f) => sum + (f.compressed?.size || 0), 0))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Space Saved:</span>
                        <span className="font-medium text-green-600">
                          {formatFileSize(
                            files.reduce((sum, f) => sum + f.size, 0) - 
                            compressedFiles.reduce((sum, f) => sum + (f.compressed?.size || 0), 0)
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column - Image Previews */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <ImagePreview
                files={files}
                onRemoveFile={removeFile}
                onDownloadFile={(file) => {
                  if (file.compressed) {
                    downloadSingleFile(file.compressed, file.name);
                  }
                }}
              />
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
