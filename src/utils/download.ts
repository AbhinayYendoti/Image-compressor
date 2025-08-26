import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ImageFile, CompressedImage } from '@/types';
import { sanitizeFilename, getFileExtension } from './compression';

export async function downloadSingleFile(
  compressedImage: CompressedImage,
  originalName: string
): Promise<void> {
  try {
    const extension = compressedImage.format;
    const baseName = originalName.replace(/\.[^/.]+$/, ''); // Remove original extension
    const sanitizedName = sanitizeFilename(baseName);
    const fileName = `${sanitizedName}_compressed.${extension}`;
    
    saveAs(compressedImage.blob, fileName);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error('Failed to download file');
  }
}

export async function downloadBatchAsZip(
  files: ImageFile[]
): Promise<void> {
  try {
    const zip = new JSZip();
    const validFiles = files.filter(file => file.compressed && !file.error);
    
    if (validFiles.length === 0) {
      throw new Error('No valid compressed files to download');
    }

    // Add each compressed file to the ZIP
    for (const file of validFiles) {
      if (file.compressed) {
        const extension = file.compressed.format;
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const sanitizedName = sanitizeFilename(baseName);
        const fileName = `${sanitizedName}_compressed.${extension}`;
        
        zip.file(fileName, file.compressed.blob);
      }
    }

    // Generate and download the ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const zipFileName = `compressed_images_${timestamp}.zip`;
    
    saveAs(zipBlob, zipFileName);
  } catch (error) {
    console.error('Error creating ZIP file:', error);
    throw new Error('Failed to create ZIP file');
  }
}

export function createDownloadUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokeDownloadUrl(url: string): void {
  URL.revokeObjectURL(url);
}

export function getDownloadFileName(originalName: string, format: string): string {
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  const sanitizedName = sanitizeFilename(baseName);
  return `${sanitizedName}_compressed.${format}`;
}

export function formatDownloadSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
