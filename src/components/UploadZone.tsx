import { useCallback, useRef, useState } from 'react';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const ACCEPT_STRING = '.pdf,.png,.jpg,.jpeg';

export default function UploadZone({ onFilesSelected, disabled }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const valid = Array.from(fileList).filter((f) =>
        ACCEPTED_TYPES.includes(f.type)
      );
      if (valid.length > 0) {
        onFilesSelected(valid);
      }
    },
    [onFilesSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
        transition-colors duration-200
        ${isDragOver
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-slate-600 hover:border-slate-400 bg-slate-800/50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_STRING}
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <div className="text-slate-400 mb-2">
        <svg
          className="w-12 h-12 mx-auto mb-4 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16"
          />
        </svg>
        <p className="text-lg font-medium text-slate-300">
          Drop files here or click to upload
        </p>
        <p className="text-sm text-slate-500 mt-1">
          Supports PDF, PNG, and JPG files
        </p>
      </div>
    </div>
  );
}
