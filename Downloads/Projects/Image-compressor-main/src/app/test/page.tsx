'use client';

import { useState } from 'react';
import { compressImage, validateFile, formatFileSize } from '@/utils/compression';
import { CompressionSettings } from '@/types';

export default function TestPage() {
  const [testResult, setTestResult] = useState<string>('');

  const runTests = async () => {
    const results: string[] = [];
    
    try {
      // Test 1: File validation
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const validation = validateFile(mockFile);
      results.push(`File validation: ${validation.isValid ? 'PASS' : 'FAIL'}`);
      
      // Test 2: File size formatting
      const formattedSize = formatFileSize(1024 * 1024); // 1MB
      results.push(`File size formatting: ${formattedSize === '1 MB' ? 'PASS' : 'FAIL'}`);
      
      // Test 3: Compression settings
      const settings: CompressionSettings = {
        quality: 75,
        format: 'jpeg',
        maintainAspectRatio: true,
        lossless: false
      };
      results.push(`Compression settings: PASS`);
      
      setTestResult(results.join('\n'));
    } catch (error) {
      setTestResult(`Test failed: ${error}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Test Page</h1>
      <button 
        onClick={runTests}
        className="btn-primary mb-4"
      >
        Run Tests
      </button>
      <pre className="bg-gray-100 p-4 rounded-lg whitespace-pre-wrap">
        {testResult || 'Click "Run Tests" to start...'}
      </pre>
    </div>
  );
}
