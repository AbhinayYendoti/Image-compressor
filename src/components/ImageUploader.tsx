import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, AlertCircle, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { ImageFile } from '@/types';
import { formatFileSize } from '@/utils/compression';

interface ImageUploaderProps {
  getRootProps: () => any;
  getInputProps: () => any;
  isDragActive: boolean;
  files: ImageFile[];
  onRemoveFile: (fileId: string) => void;
}

export default function ImageUploader({
  getRootProps,
  getInputProps,
  isDragActive,
  files,
  onRemoveFile
}: ImageUploaderProps) {
  const validFiles = files.filter(file => !file.error);
  const errorFiles = files.filter(file => file.error);

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'dropzone-active' : ''} ${
          errorFiles.length > 0 ? 'dropzone-reject' : ''
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full">
            <Upload className="w-8 h-8 text-primary-600" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isDragActive ? 'Drop images here' : 'Upload Images'}
            </h3>
            <p className="text-gray-600 mb-4">
              Drag & drop your images here, or click to browse
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p>Supported formats: JPG, PNG, GIF, WebP, SVG</p>
              <p>Maximum file size: 50MB per file</p>
            </div>
          </div>
        </div>
      </div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <h3 className="font-semibold text-gray-900">
              Uploaded Files ({files.length})
            </h3>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {files.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    file.error 
                      ? 'bg-red-50 border-red-200' 
                      : file.compressed 
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  {/* File Icon */}
                  <div className="flex-shrink-0">
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      {file.error && (
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                      {file.compressed && (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                      {file.isProcessing && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 flex-shrink-0"></div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
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
                    {file.error && (
                      <p className="text-xs text-red-600 mt-1">{file.error}</p>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => onRemoveFile(file.id)}
                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Summary */}
            {files.length > 0 && (
              <div className="text-sm text-gray-600">
                <p>
                  {validFiles.length} valid file{validFiles.length !== 1 ? 's' : ''}
                  {errorFiles.length > 0 && (
                    <span className="text-red-600">
                      , {errorFiles.length} error{errorFiles.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
