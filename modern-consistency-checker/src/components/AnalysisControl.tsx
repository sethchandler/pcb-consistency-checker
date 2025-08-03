import React, { useState } from 'react';
import { Eye, Search, Loader2 } from 'lucide-react';
import { useConsistencyStore } from '../store/useConsistencyStore';
import { isValidApiKey } from '../utils/modelProviders';
import PreviewModal from './PreviewModal';
import { runConsistencyAnalysis } from '../utils/analysisRunnerNew';

const AnalysisControl: React.FC = () => {
  const { 
    uploadedFiles, 
    apiKey,
    selectedProvider,
    isProcessing,
    currentProgress,
    setIsProcessing,
    setError 
  } = useConsistencyStore();
  
  const [showPreview, setShowPreview] = useState(false);

  const hasFiles = uploadedFiles.length > 0;
  const needsApiKey = selectedProvider !== 'ollama';
  const hasValidKey = needsApiKey ? isValidApiKey(selectedProvider, apiKey) : true;
  const canAnalyze = hasFiles && hasValidKey && !isProcessing;

  const handleAnalysis = async () => {
    if (!canAnalyze) return;

    setError(null);
    setIsProcessing(true);

    try {
      await runConsistencyAnalysis();
    } catch (error: any) {
      console.error('Analysis error:', error);
      setError(error.message || 'Analysis failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const getButtonText = () => {
    if (isProcessing && currentProgress) return currentProgress;
    if (isProcessing) return 'Processing...';
    if (!hasFiles) return 'Upload Files First';
    if (needsApiKey && !hasValidKey) return 'Enter API Key';
    return 'Process & Analyze Documents';
  };

  return (
    <>
      <div className="flex justify-center space-x-4 my-8">
        <button
          onClick={() => setShowPreview(true)}
          disabled={!hasFiles}
          className={`
            flex items-center px-6 py-3 rounded-lg font-medium transition-all
            ${hasFiles 
              ? 'bg-gray-600 text-white hover:bg-gray-700' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <Eye className="mr-2" size={20} />
          Preview Processed Documents
        </button>

        <button
          onClick={handleAnalysis}
          disabled={!canAnalyze}
          className={`
            flex items-center px-6 py-3 rounded-lg font-medium transition-all
            ${canAnalyze 
              ? 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isProcessing ? (
            <Loader2 className="mr-2 animate-spin" size={20} />
          ) : (
            <Search className="mr-2" size={20} />
          )}
          {getButtonText()}
        </button>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <PreviewModal onClose={() => setShowPreview(false)} />
      )}
    </>
  );
};

export default AnalysisControl;