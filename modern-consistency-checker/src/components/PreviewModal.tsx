import React, { useState, useEffect } from 'react';
import { X, FileText, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useConsistencyStore } from '../store/useConsistencyStore';
import { extractFileContent } from '../utils/fileProcessing';
import type { ExtractedContent } from '../types';

interface PreviewModalProps {
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ onClose }) => {
  const { uploadedFiles } = useConsistencyStore();
  const [extractedContents, setExtractedContents] = useState<Map<number, ExtractedContent>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedFiles, setExpandedFiles] = useState<Set<number>>(new Set());

  useEffect(() => {
    const extractAllFiles = async () => {
      const contents = new Map<number, ExtractedContent>();
      
      for (let i = 0; i < uploadedFiles.length; i++) {
        try {
          const extracted = await extractFileContent(uploadedFiles[i]);
          contents.set(i, extracted);
        } catch (error) {
          console.error(`Error extracting ${uploadedFiles[i].name}:`, error);
          contents.set(i, {
            content: `Error extracting content: ${error}`,
            metadata: { documentType: 'error' },
            structured: false
          });
        }
      }
      
      setExtractedContents(contents);
      setLoading(false);
    };

    extractAllFiles();
  }, [uploadedFiles]);

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedFiles(newExpanded);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
            <FileText className="mr-2" size={28} />
            Document Processing Preview
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin mr-2" size={24} />
              <span>Processing files...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 mb-4">
                This shows what content was extracted from each file and how it will be processed:
              </p>

              {uploadedFiles.map((file, index) => {
                const content = extractedContents.get(index);
                const isExpanded = expandedFiles.has(index);

                return (
                  <div key={index} className="border border-blue-200 rounded-lg bg-blue-50 p-4">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg flex items-center">
                        <FileText className="mr-2" size={20} />
                        {file.name}
                      </h3>
                      
                      <div className="text-sm space-y-1">
                        <p><strong>File Type:</strong> {file.type.toUpperCase()}</p>
                        <p><strong>Document Type:</strong> {content?.metadata.documentType || 'Unknown'}</p>
                        <p><strong>Structured:</strong> {content?.structured ? '✅ Yes' : '❌ No (will be processed by AI)'}</p>
                      </div>

                      {content && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleExpanded(index)}
                            className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            <span className="ml-1">
                              {isExpanded ? 'Hide' : 'Show'} extracted content 
                              ({content.content.length.toLocaleString()} characters)
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="mt-3 bg-white rounded p-4 max-h-96 overflow-y-auto">
                              <pre className="text-xs font-mono whitespace-pre-wrap">
                                {content.content}
                              </pre>
                            </div>
                          )}

                          {content.metadata && Object.keys(content.metadata).length > 0 && (
                            <details className="mt-3">
                              <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                                View metadata
                              </summary>
                              <pre className="mt-2 bg-white rounded p-4 text-xs font-mono overflow-x-auto">
                                {JSON.stringify(content.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-yellow-800 mb-2">ℹ️ Processing Notes:</h4>
                <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                  {uploadedFiles.some(f => f.type === 'docx') && (
                    <li><strong>DOCX files:</strong> Currently showing placeholder text. For best results, convert to text files.</li>
                  )}
                  <li><strong>Unstructured documents:</strong> Will be processed by AI to extract parties, dates, locations, and key facts.</li>
                  <li><strong>PDF extraction:</strong> Text is extracted from PDFs automatically. Complex formatting may affect accuracy.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;