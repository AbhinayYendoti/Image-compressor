import { ImageFile, CompressedImage, CompressionSettings, SupportedFormat } from '@/types';

export const SUPPORTED_FORMATS: SupportedFormat[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

export const FORMAT_INFO = {
  'image/jpeg': { extension: 'jpg', name: 'JPEG', supportsLossless: false, maxQuality: 100, minQuality: 1 },
  'image/png': { extension: 'png', name: 'PNG', supportsLossless: true, maxQuality: 100, minQuality: 1 },
  'image/gif': { extension: 'gif', name: 'GIF', supportsLossless: true, maxQuality: 100, minQuality: 1 },
  'image/webp': { extension: 'webp', name: 'WebP', supportsLossless: true, maxQuality: 100, minQuality: 1 },
  'image/svg+xml': { extension: 'svg', name: 'SVG', supportsLossless: true, maxQuality: 100, minQuality: 1 }
};

export const COMPRESSION_PRESETS = [
  {
    id: 'high-quality',
    name: 'High Quality',
    description: 'Minimal compression, maximum quality',
    settings: { quality: 90, format: 'jpeg' as const, maintainAspectRatio: true, lossless: false }
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Good balance of quality and file size',
    settings: { quality: 75, format: 'jpeg' as const, maintainAspectRatio: true, lossless: false }
  },
  {
    id: 'small-size',
    name: 'Small Size',
    description: 'Maximum compression, smaller file size',
    settings: { quality: 50, format: 'jpeg' as const, maintainAspectRatio: true, lossless: false }
  },
  {
    id: 'webp-optimized',
    name: 'WebP Optimized',
    description: 'Modern format with excellent compression',
    settings: { quality: 80, format: 'webp' as const, maintainAspectRatio: true, lossless: false }
  },
  {
    id: 'lossless',
    name: 'Lossless',
    description: 'No quality loss, PNG format',
    settings: { quality: 100, format: 'png' as const, maintainAspectRatio: true, lossless: true }
  }
];

export function validateFile(file: File): { isValid: boolean; error?: string } {
  // Check file size (max 50MB)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 50MB' };
  }

  // Check file type
  if (!SUPPORTED_FORMATS.includes(file.type as SupportedFormat)) {
    return { isValid: false, error: 'Unsupported file format' };
  }

  return { isValid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function calculateCompressionRatio(originalSize: number, compressedSize: number): number {
  return ((originalSize - compressedSize) / originalSize) * 100;
}

export async function compressImage(
  file: File,
  settings: CompressionSettings
): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (settings.maxWidth && width > settings.maxWidth) {
          if (settings.maintainAspectRatio) {
            height = (height * settings.maxWidth) / width;
            width = settings.maxWidth;
          } else {
            width = settings.maxWidth;
          }
        }
        
        if (settings.maxHeight && height > settings.maxHeight) {
          if (settings.maintainAspectRatio) {
            width = (width * settings.maxHeight) / height;
            height = settings.maxHeight;
          } else {
            height = settings.maxHeight;
          }
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw image with new dimensions
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        const mimeType = `image/${settings.format}`;
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const compressionRatio = calculateCompressionRatio(file.size, blob.size);
            
            resolve({
              blob,
              size: blob.size,
              quality: settings.quality,
              format: settings.format,
              width,
              height,
              compressionRatio
            });
          },
          mimeType,
          settings.quality / 100
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

export async function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        // Create thumbnail (max 200x200)
        const maxSize = 200;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

export function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}
