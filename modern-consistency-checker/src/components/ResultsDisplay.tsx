import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Clock, Users, Download, Copy, Check, ChevronDown, Brain, Sliders } from 'lucide-react';
import { marked } from 'marked';
import { useConsistencyStore } from '../store/useConsistencyStore';
import { addTableNumbering, countInconsistencies } from '../utils/tableNumbering';
import { tfIdfMerge } from '../utils/tfIdfMerge';
import { cleanTableContent } from '../utils/multiPassAnalysis';

const ResultsDisplay: React.FC = () => {
  const { 
    analysisResults, 
    uploadedFiles, 
    rawPassResults, 
    lastAnalysisSettings, 
    mergeTheta 
  } = useConsistencyStore();
  const [copied, setCopied] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [liveThetaValue, setLiveThetaValue] = useState(mergeTheta);
  const [debouncedTheta, setDebouncedTheta] = useState(liveThetaValue);

  // Debounce theta changes to prevent excessive recalculations during slider movement
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTheta(liveThetaValue);
    }, 200); // 200ms debounce
    
    return () => clearTimeout(timer);
  }, [liveThetaValue]);

  // Determine if we should show live theta controls and use live merging
  const shouldUseLiveMerging = rawPassResults.length > 1 && 
                               lastAnalysisSettings?.passStrategy === 'intersection';

  // Validate state consistency to prevent race conditions
  const isStateConsistent = useMemo(() => {
    if (!analysisResults) return true; // No analysis yet - consistent
    if (!shouldUseLiveMerging) return true; // Single pass - no sync needed
    
    // For multipass intersection, we need raw results to be available
    const hasValidRawResults = rawPassResults.length >= 2;
    const hasMatchingPassCount = rawPassResults.length === lastAnalysisSettings?.numberOfPasses;
    
    return hasValidRawResults && hasMatchingPassCount;
  }, [analysisResults, shouldUseLiveMerging, rawPassResults, lastAnalysisSettings]);

  // TODO: Add vocabulary caching for TF-IDF optimization in future iteration

  // Compute live merged content when theta changes
  const liveContent = useMemo(() => {
    if (!analysisResults) {
      return ''; // No analysis results yet
    }
    
    if (!shouldUseLiveMerging || rawPassResults.length < 2) {
      return analysisResults.content; // Use stored content for single pass
    }

    // Check for state consistency before attempting live merging
    if (!isStateConsistent) {
      console.warn('State inconsistency detected: rawPassResults and analysisResults out of sync');
      return analysisResults.content; // Fall back to stored content with warning
    }

    // Perform progressive intersection merge with debounced theta
    let result = rawPassResults[0];
    for (let i = 1; i < rawPassResults.length; i++) {
      const mergeResult = tfIdfMerge(result, rawPassResults[i], debouncedTheta);
      result = cleanTableContent(mergeResult.content);
    }
    
    return result;
  }, [analysisResults, debouncedTheta, rawPassResults, shouldUseLiveMerging, isStateConsistent]);

  // Count matches for the current theta
  const currentMatchCount = useMemo(() => {
    return countInconsistencies(liveContent);
  }, [liveContent]);

  if (!analysisResults) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(addTableNumbering(liveContent));
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
        const htmlContent = marked(addTableNumbering(liveContent), { gfm: true, breaks: true });
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
        content = addTableNumbering(liveContent);
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
          {/* Reasoning Toggle Button - only show if merge reasoning exists */}
          {analysisResults.mergeReasoning && analysisResults.mergeReasoning.length > 0 && (
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className={`flex items-center px-3 py-2 rounded transition-colors ${
                showReasoning 
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
              title="Show Merge Reasoning"
            >
              <Brain className="mr-1" size={16} />
              {showReasoning ? 'Hide' : 'Show'} Reasoning
            </button>
          )}
          
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

      {/* Live Theta Control for Multi-pass Intersection */}
      {shouldUseLiveMerging && (
        <div className={`mb-6 rounded-lg p-4 ${
          isStateConsistent 
            ? 'bg-blue-50 border border-blue-200' 
            : 'bg-orange-50 border border-orange-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-blue-800 flex items-center">
              <Sliders className="mr-2" size={20} />
              Live Similarity Threshold (θ)
            </h3>
            <span className={`text-sm ${isStateConsistent ? 'text-blue-600' : 'text-orange-600'}`}>
              {isStateConsistent ? (
                <>
                  {currentMatchCount} match{currentMatchCount === 1 ? '' : 'es'} at θ={debouncedTheta.toFixed(2)}
                  {liveThetaValue !== debouncedTheta && (
                    <span className="ml-1 text-xs text-gray-500">
                      (updating to {liveThetaValue.toFixed(2)}...)
                    </span>
                  )}
                </>
              ) : (
                'State sync issue - using stored results'
              )}
            </span>
          </div>
          
          {/* State inconsistency warning */}
          {!isStateConsistent && (
            <div className="mb-3 p-2 bg-orange-100 border border-orange-300 rounded text-sm text-orange-800">
              ⚠️ <strong>State Synchronization Issue:</strong> Raw pass results and analysis results are out of sync. 
              Live theta adjustment is temporarily disabled. Please re-run the analysis.
            </div>
          )}
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-blue-700">
              Threshold: {liveThetaValue.toFixed(2)} 
              <span className="ml-2 text-xs text-blue-600">
                (Adjust to see instant results)
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="0.4"
              step="0.01"
              value={liveThetaValue}
              onChange={(e) => setLiveThetaValue(parseFloat(e.target.value))}
              disabled={!isStateConsistent}
              className={`w-full h-2 rounded-lg appearance-none ${
                isStateConsistent 
                  ? 'bg-blue-200 cursor-pointer' 
                  : 'bg-gray-200 cursor-not-allowed opacity-50'
              }`}
            />
            <div className="flex justify-between mt-2">
              <button
                onClick={() => setLiveThetaValue(0.02)}
                disabled={!isStateConsistent}
                className={`text-xs px-2 py-1 rounded ${
                  isStateConsistent
                    ? 'bg-blue-200 text-blue-800 hover:bg-blue-300 cursor-pointer'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-50'
                }`}
              >
                Lenient (0.02)
              </button>
              <button
                onClick={() => setLiveThetaValue(0.1)}
                disabled={!isStateConsistent}
                className={`text-xs px-2 py-1 rounded ${
                  isStateConsistent
                    ? 'bg-blue-200 text-blue-800 hover:bg-blue-300 cursor-pointer'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-50'
                }`}
              >
                Default (0.1)
              </button>
              <button
                onClick={() => setLiveThetaValue(0.3)}
                disabled={!isStateConsistent}
                className={`text-xs px-2 py-1 rounded ${
                  isStateConsistent
                    ? 'bg-blue-200 text-blue-800 hover:bg-blue-300 cursor-pointer'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-50'
                }`}
              >
                Strict (0.3)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Content */}
      <div className="border border-gray-200 rounded-lg">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-800">Analysis Report</h3>
            <span className="text-sm text-gray-600">
              {currentMatchCount} inconsistenc{currentMatchCount === 1 ? 'y' : 'ies'} found
              {shouldUseLiveMerging && (
                <span className="ml-2 text-blue-600">(Live θ={liveThetaValue.toFixed(2)})</span>
              )}
            </span>
          </div>
        </div>
        <div className="p-6">
          <div 
            className="analysis-content prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ 
              __html: marked(addTableNumbering(liveContent), {
                gfm: true, // Enable GitHub Flavored Markdown (includes tables)
                breaks: true
              })
            }}
          />
        </div>
      </div>

      {/* Merge Reasoning Display */}
      {showReasoning && analysisResults.mergeReasoning && analysisResults.mergeReasoning.length > 0 && (
        <div className="mt-6 border border-purple-200 rounded-lg bg-purple-50">
          <div className="bg-purple-100 px-4 py-3 border-b border-purple-200">
            <h3 className="text-lg font-medium text-purple-800 flex items-center">
              <Brain className="mr-2" size={20} />
              Merge Reasoning Analysis
            </h3>
            <p className="text-sm text-purple-600 mt-1">
              Step-by-step reasoning for how the intersection merge was performed
            </p>
          </div>
          <div className="p-6 space-y-6">
            {analysisResults.mergeReasoning.map((reasoning, mergeIndex) => (
              <div key={mergeIndex} className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="mb-4">
                  <h4 className="text-md font-semibold text-purple-800 mb-2">
                    Merge Operation #{mergeIndex + 1}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Rows in Table A:</span>
                      <span className="ml-2 text-gray-600">{reasoning.totalRowsA || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Rows in Table B:</span>
                      <span className="ml-2 text-gray-600">{reasoning.totalRowsB || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Matches Found:</span>
                      <span className="ml-2 text-green-600 font-medium">{reasoning.matchesFound || 0}</span>
                    </div>
                  </div>
                  {reasoning.approach && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium text-gray-700">Analysis Approach:</span>
                      <span className="ml-2 text-gray-600">{reasoning.approach}</span>
                    </div>
                  )}
                </div>

                {reasoning.abstractionProcess && reasoning.abstractionProcess.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="font-medium text-gray-800">Row-by-Row Analysis:</h5>
                    {reasoning.abstractionProcess.map((process, processIndex) => (
                      <div key={processIndex} className="border-l-4 border-purple-300 pl-4 py-2 bg-gray-50 rounded-r">
                        <div className="text-sm">
                          <div className="font-medium text-gray-800 mb-1">
                            Row {processIndex + 1}: {process.abstractedIntent}
                          </div>
                          <div className="text-gray-600 mb-2 text-xs">
                            "{process.rowFromA}"
                          </div>
                          <div className={`flex items-center text-sm ${
                            process.matchFoundInB ? 'text-green-700' : 'text-orange-700'
                          }`}>
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                              process.matchFoundInB ? 'bg-green-500' : 'bg-orange-500'
                            }`}></span>
                            {process.matchFoundInB ? 'Match Found' : 'No Match'}
                          </div>
                          {process.matchingRowB && (
                            <div className="text-xs text-gray-500 mt-1 italic">
                              Matched with: "{process.matchingRowB}"
                            </div>
                          )}
                          <div className="text-xs text-gray-600 mt-1">
                            <strong>Explanation:</strong> {process.explanation}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {reasoning.finalDecision && (
                  <div className="mt-4 p-3 bg-purple-100 rounded border-l-4 border-purple-400">
                    <h5 className="font-medium text-purple-800 mb-1">Final Decision:</h5>
                    <p className="text-sm text-purple-700">{reasoning.finalDecision}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsDisplay;