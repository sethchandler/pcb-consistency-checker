import { useEffect } from 'react';
import { useConsistencyStore } from './store/useConsistencyStore';
import FileUpload from './components/FileUpload';
import ApiKeyInput from './components/ApiKeyInput';
import PromptEditor from './components/PromptEditor';
import AnalysisEmphasis from './components/AnalysisEmphasis';
import AnalysisControl from './components/AnalysisControl';
import ResultsDisplay from './components/ResultsDisplay';
import ErrorDisplay from './components/ErrorDisplay';
import CostTracker from './components/CostTracker';

function App() {
  const error = useConsistencyStore((state) => state.error);
  const resetSessionCost = useConsistencyStore((state) => state.resetSessionCost);

  // Reset session cost on app launch
  useEffect(() => {
    resetSessionCost();
  }, [resetSessionCost]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <header className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-blue-600">PCB Consistency Checker</h1>
          <p className="text-gray-600 mt-2">
            Modern version with Vite + React + TypeScript + Zustand
          </p>
        </header>

        {/* Error Display */}
        {error && <ErrorDisplay />}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <FileUpload />
            <ApiKeyInput />
            <CostTracker />
            <AnalysisEmphasis />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <PromptEditor />
          </div>
        </div>

        {/* Analysis Control */}
        <AnalysisControl />

        {/* Results */}
        <ResultsDisplay />
      </div>
    </div>
  );
}

export default App;