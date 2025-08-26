import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { ImageFile } from '@/types';
import { formatFileSize } from '@/utils/compression';

interface ImagePreviewProps {
  files: ImageFile[];
  onRemoveFile: (fileId: string) => void;
  onDownloadFile: (file: ImageFile) => void;
}

export default function ImagePreview({
  files,
  onRemoveFile,
  onDownloadFile
}: ImagePreviewProps) {
  if (files.length === 0) {
    return (
      <div className="card text-center py-12">
        <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4">
          <ImageIcon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No images uploaded yet
        </h3>
        <p className="text-gray-500">
          Upload some images to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Image Previews ({files.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {files.map((file) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`card overflow-hidden ${
                file.error ? 'border-red-200 bg-red-50' : ''
              }`}
            >
              {/* File Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">
                    {file.name}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{formatFileSize(file.size)}</span>
                    {file.compressed && (
                      <>
                        <span>→</span>
                        <span className="text-green-600">
                          {formatFileSize(file.compressed.size)}
                        </span>
                        <span className="text-green-600">
                          ({file.compressed.compressionRatio.toFixed(1)}% smaller)
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {file.error && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  {file.compressed && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {file.isProcessing && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                  )}
                  <button
                    onClick={() => onRemoveFile(file.id)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Error State */}
              {file.error && (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <p className="text-red-600 font-medium mb-1">Error</p>
                  <p className="text-sm text-red-500">{file.error}</p>
                </div>
              )}

              {/* Image Preview */}
              {!file.error && (
                <div className="space-y-4">
                  {/* Original Image */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">
                      Original
                    </h5>
                    <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt={`Original ${file.name}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {file.compressed && (
                        <span>
                          {file.compressed.width} × {file.compressed.height}px
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Compressed Image */}
                  {file.compressed && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        Compressed ({file.compressed.format.toUpperCase()})
                      </h5>
                      <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={URL.createObjectURL(file.compressed.blob)}
                          alt={`Compressed ${file.name}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {file.compressed.width} × {file.compressed.height}px
                        </span>
                        <span className="text-green-600">
                          {file.compressed.quality}% quality
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Processing State */}
                  {file.isProcessing && (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Compressing...</p>
                    </div>
                  )}

                  {/* Download Button */}
                  {file.compressed && !file.isProcessing && (
                    <button
                      onClick={() => onDownloadFile(file)}
                      className="w-full btn-outline flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Compressed
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Summary Stats */}
      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <h4 className="font-semibold text-gray-900 mb-3">Compression Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Total Files</p>
              <p className="font-medium text-gray-900">{files.length}</p>
            </div>
            <div>
              <p className="text-gray-500">Original Size</p>
              <p className="font-medium text-gray-900">
                {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Compressed Size</p>
              <p className="font-medium text-gray-900">
                {formatFileSize(
                  files
                    .filter(f => f.compressed)
                    .reduce((sum, f) => sum + (f.compressed?.size || 0), 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Space Saved</p>
              <p className="font-medium text-green-600">
                {formatFileSize(
                  files.reduce((sum, f) => sum + f.size, 0) -
                  files
                    .filter(f => f.compressed)
                    .reduce((sum, f) => sum + (f.compressed?.size || 0), 0)
                )}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
