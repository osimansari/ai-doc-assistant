import { useState, useRef } from 'react';

interface Props {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
}

export default function UploadPanel({ onUpload, isUploading }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    // Reset so the same file can be uploaded again
    e.target.value = '';
  };

  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Upload Documents
      </h2>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,.docx"
          onChange={handleFileChange}
          className="hidden"
        />
        {isUploading ? (
          <div>
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm text-gray-500">Processing...</p>
          </div>
        ) : (
          <div>
            <p className="text-2xl mb-2">📁</p>
            <p className="text-sm font-medium text-gray-700">
              Drop file here or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-1">
              PDF, TXT, MD, DOCX
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
