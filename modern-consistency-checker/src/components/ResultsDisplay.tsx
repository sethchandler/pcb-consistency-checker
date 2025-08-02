import React, { useState } from 'react';
import { FileText, Clock, Users, Download, Copy, Check, ChevronDown } from 'lucide-react';
import { marked } from 'marked';
import { useConsistencyStore } from '../store/useConsistencyStore';
import { addTableNumbering, countInconsistencies } from '../utils/tableNumbering';

const ResultsDisplay: React.FC = () => {
  const { analysisResults, uploadedFiles } = useConsistencyStore();
  const [copied, setCopied] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);

  if (!analysisResults) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(addTableNumbering(analysisResults.content));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownload = (format: 'json' | 'md' | 'html') => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '').replace('T', '-');
    let content: string;
    let filename: string; 
    let mimeType: string;

    switch (format) {
      case 'json':
        content = JSON.stringify({
          analysisResults,
          uploadedFiles: uploadedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })),
          timestamp: new Date().toISOString()
        }, null, 2);
        filename = `consistency-analysis-${timestamp}.json`;
        mimeType = 'application/json';
        break;
      case 'html':
        const htmlContent = marked(addTableNumbering(analysisResults.content), { gfm: true, breaks: true });
        content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Consistency Analysis Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #f8f9fa; font-weight: 600; }
    tbody tr:nth-child(even) { background-color: #f8f9fa; }
    h1, h2, h3 { color: #1f2937; }
  </style>
</head>
<body>
  <h1>PCB Consistency Analysis Report</h1>
  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  ${htmlContent}
</body>
</html>`;
        filename = `consistency-analysis-${timestamp}.html`;
        mimeType = 'text/html';
        break;
      default: // 'md'
        content = addTableNumbering(analysisResults.content);
        filename = `consistency-analysis-${timestamp}.md`;
        mimeType = 'text/markdown';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
          <FileText className="mr-2" size={28} />
          Consistency Analysis Results
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title="Copy to Clipboard"
          >
            {copied ? <Check className="mr-1" size={16} /> : <Copy className="mr-1" size={16} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          
          {/* Split Download Button */}
          <div className="relative">
            <div className="flex">
              <button
                onClick={() => handleDownload('md')}
                className="flex items-center px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-l transition-colors"
              >
                <Download className="mr-1" size={16} />
                Download
              </button>
              <button
                onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                className="px-2 py-2 bg-blue-600 text-white hover:bg-blue-700 border-l border-blue-500 rounded-r transition-colors"
              >
                <ChevronDown size={16} />
              </button>
            </div>
            
            {showDownloadDropdown && (
              <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <button
                  onClick={() => { handleDownload('md'); setShowDownloadDropdown(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-md"
                >
                  📄 Markdown
                </button>
                <button
                  onClick={() => { handleDownload('json'); setShowDownloadDropdown(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  📊 JSON
                </button>
                <button
                  onClick={() => { handleDownload('html'); setShowDownloadDropdown(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-b-md"
                >
                  🌐 HTML
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Metadata */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center">
            <Clock className="mr-2 text-gray-500" size={16} />
            <div>
              <p className="font-medium text-gray-700">Analyzed</p>
              <p className="text-gray-600">{formatTimestamp(analysisResults.metadata.timestamp)}</p>
            </div>
          </div>
          <div className="flex items-center">
            <FileText className="mr-2 text-gray-500" size={16} />
            <div>
              <p className="font-medium text-gray-700">Documents</p>
              <p className="text-gray-600">{analysisResults.metadata.fileCount}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Users className="mr-2 text-gray-500" size={16} />
            <div>
              <p className="font-medium text-gray-700">Model</p>
              <p className="text-gray-600">{analysisResults.metadata.model}</p>
            </div>
          </div>
          <div className="flex items-center">
            <FileText className="mr-2 text-gray-500" size={16} />
            <div>
              <p className="font-medium text-gray-700">Content Length</p>
              <p className="text-gray-600">{analysisResults.metadata.totalCharacters.toLocaleString()} chars</p>
            </div>
          </div>
        </div>
      </div>

      {/* Source Files */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-3">Analyzed Documents</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {uploadedFiles.map((file, index) => (
            <div key={index} className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <FileText className="mr-2 text-blue-600" size={20} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-blue-900 truncate">{file.name}</p>
                <p className="text-xs text-blue-700">{file.type.toUpperCase()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analysis Content */}
      <div className="border border-gray-200 rounded-lg">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-800">Analysis Report</h3>
            <span className="text-sm text-gray-600">
              {countInconsistencies(analysisResults.content)} inconsistenc{countInconsistencies(analysisResults.content) === 1 ? 'y' : 'ies'} found
            </span>
          </div>
        </div>
        <div className="p-6">
          <div 
            className="analysis-content prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ 
              __html: marked(addTableNumbering(analysisResults.content), {
                gfm: true, // Enable GitHub Flavored Markdown (includes tables)
                breaks: true
              })
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;