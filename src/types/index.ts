export interface ImageFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
  compressed?: CompressedImage;
  error?: string;
  isProcessing: boolean;
}

export interface CompressedImage {
  blob: Blob;
  size: number;
  quality: number;
  format: string;
  width: number;
  height: number;
  compressionRatio: number;
  downloadUrl?: string;
}

export interface CompressionSettings {
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
  maxWidth?: number;
  maxHeight?: number;
  maintainAspectRatio: boolean;
  lossless: boolean;
}

export interface CompressionResult {
  original: ImageFile;
  compressed: CompressedImage;
  processingTime: number;
}

export interface BatchCompressionResult {
  results: CompressionResult[];
  totalOriginalSize: number;
  totalCompressedSize: number;
  totalSavings: number;
  processingTime: number;
}

export interface UploadProgress {
  fileId: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export type SupportedFormat = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'image/svg+xml';

export interface FormatInfo {
  mimeType: SupportedFormat;
  extension: string;
  name: string;
  supportsLossless: boolean;
  maxQuality: number;
  minQuality: number;
}

export interface CompressionPreset {
  id: string;
  name: string;
  description: string;
  settings: CompressionSettings;
}

export interface UserPreferences {
  defaultQuality: number;
  defaultFormat: string;
  autoDownload: boolean;
  showFileSize: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export interface AnalyticsEvent {
  event: string;
  timestamp: number;
  data?: Record<string, any>;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}
