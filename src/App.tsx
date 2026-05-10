import { useState, useCallback } from 'react';
import type { FileItem } from '@/types';
import { processFile, combineToPdf } from '@/lib/pdf-processor';
import UploadZone from '@/components/UploadZone';
import FileList from '@/components/FileList';
import CombineButton from '@/components/CombineButton';

export default function App() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    setIsUploading(true);
    try {
      const results: FileItem[] = [];
      for (const file of files) {
        try {
          const fileItems = await processFile(file);
          results.push(...fileItems);
        } catch (err) {
          alert(`Error processing "${file.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
      if (results.length > 0) {
        setItems((prev) => [...prev, ...results]);
      }
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleReorder = useCallback((newItems: FileItem[]) => {
    setItems(newItems);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    setItems([]);
  }, []);

  const handleCombine = useCallback(async () => {
    if (items.length === 0) return;
    setIsProcessing(true);
    try {
      const pdfBytes = await combineToPdf(items);
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'combined.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Error combining files: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [items]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">PDF Combiner</h1>
          <p className="text-slate-400 mt-1">
            Upload images and PDFs, reorder them, and combine into a single PDF.
          </p>
        </header>

        {/* Upload Zone */}
        <UploadZone
          onFilesSelected={handleFilesSelected}
          disabled={isUploading || isProcessing}
        />

        {/* File List */}
        {items.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-slate-200">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </h2>
              <button
                onClick={handleClearAll}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Clear All
              </button>
            </div>
            <FileList
              items={items}
              onReorder={handleReorder}
              onRemove={handleRemove}
            />
          </div>
        )}

        {/* Combine Button */}
        {items.length > 0 && (
          <div className="mt-8 flex justify-center">
            <CombineButton
              disabled={items.length === 0}
              isProcessing={isProcessing}
              onClick={handleCombine}
            />
          </div>
        )}

        {/* Upload spinner */}
        {isUploading && (
          <div className="mt-4 text-center text-slate-400 text-sm">
            Processing files...
          </div>
        )}
      </div>
    </div>
  );
}
