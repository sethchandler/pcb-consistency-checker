import React from 'react';
import { AlertCircle, X, RefreshCw } from 'lucide-react';
import { useConsistencyStore } from '../store/useConsistencyStore';

const ErrorDisplay: React.FC = () => {
  const { error, setError } = useConsistencyStore();

  if (!error) {
    return null;
  }

  const handleDismiss = () => {
    setError(null);
  };

  const handleRetry = () => {
    setError(null);
    // The user can manually retry by clicking the analyze button again
  };

  const getErrorType = (errorMessage: string) => {
    if (errorMessage.includes('API key')) {
      return {
        type: 'api-key',
        title: 'API Key Error',
        suggestion: 'Please check your OpenAI API key and try again.'
      };
    }
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return {
        type: 'rate-limit',
        title: 'Rate Limit Exceeded',
        suggestion: 'Please wait a moment before trying again, or consider upgrading your OpenAI plan.'
      };
    }
    if (errorMessage.includes('model') || errorMessage.includes('404')) {
      return {
        type: 'model',
        title: 'Model Error',
        suggestion: 'The selected model may not be available. Try switching to a different model.'
      };
    }
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return {
        type: 'network',
        title: 'Network Error',
        suggestion: 'Please check your internet connection and try again.'
      };
    }
    if (errorMessage.includes('file') || errorMessage.includes('extract')) {
      return {
        type: 'file',
        title: 'File Processing Error',
        suggestion: 'There was an issue processing one of your files. Try re-uploading or using a different format.'
      };
    }
    return {
      type: 'general',
      title: 'Analysis Error',
      suggestion: 'An unexpected error occurred. Please try again.'
    };
  };

  const errorInfo = getErrorType(error);

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            {errorInfo.title}
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p className="mb-2">{error}</p>
            <p className="text-red-600">{errorInfo.suggestion}</p>
          </div>
          <div className="mt-4 flex space-x-2">
            <button
              onClick={handleRetry}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <RefreshCw className="mr-1" size={12} />
              Retry
            </button>
            <button
              onClick={handleDismiss}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <X className="mr-1" size={12} />
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;