import React, { useRef, useState } from 'react';
import { Upload, FileText, X, AlertTriangle } from 'lucide-react';
import { useConsistencyStore } from '../store/useConsistencyStore';
import { createUploadedFile } from '../utils/fileProcessing';
import { validateMultipleFiles } from '../utils/fileValidation';

const FileUpload: React.FC = () => {
  const { uploadedFiles, setUploadedFiles, setError } = useConsistencyStore();
  const [isDragging, setIsDragging] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList) => {
    // First validate the files
    const fileArray = Array.from(files);
    const validation = validateMultipleFiles(fileArray);
    
    if (!validation.isValid) {
      setError(`File validation failed: ${validation.errors.join('; ')}`);
      setWarnings([]);
      return;
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      setWarnings(validation.warnings);
    } else {
      setWarnings([]);
    }

    // Process valid files
    const newFiles = fileArray
      .map(file => createUploadedFile(file))
      .filter((file): file is NonNullable<typeof file> => file !== null);

    if (newFiles.length === 0) {
      setError('No supported files found. Please upload JSON, PDF, TXT, MD, or DOCX files.');
      return;
    }

    setUploadedFiles([...uploadedFiles, ...newFiles]);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <FileText className="mr-2" size={24} />
        Case Documents
      </h2>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        `}
      >
        <Upload className="mx-auto mb-4 text-gray-400" size={48} />
        <p className="text-gray-600 mb-2">
          Drop your case files here (JSON, PDF, TXT, MD, DOCX) or
        </p>
        <button
          type="button"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Choose Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".json,.pdf,.txt,.md,.docx"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {warnings.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Warnings</h4>
              <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                {warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Uploaded Files ({uploadedFiles.length})
          </h3>
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
            >
              <div className="flex items-center space-x-3">
                <FileText className="text-gray-500" size={20} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {file.type.toUpperCase()} • {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;