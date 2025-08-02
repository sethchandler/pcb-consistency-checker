import React from 'react';
import { FileText, RotateCcw, Download } from 'lucide-react';
import { useConsistencyStore } from '../store/useConsistencyStore';

// Get default prompt from store
const DEFAULT_PROMPT = useConsistencyStore.getState().currentPrompt;

const PromptEditor: React.FC = () => {
  const { currentPrompt, setCurrentPrompt } = useConsistencyStore();

  const handleReset = () => {
    setCurrentPrompt(DEFAULT_PROMPT);
  };

  const handleExport = () => {
    const blob = new Blob([currentPrompt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'consistency-prompt.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCurrentPrompt(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <FileText className="mr-2" size={24} />
          AI Prompt
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title="Reset to Default"
          >
            <RotateCcw size={20} />
          </button>
          <button
            onClick={handleExport}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title="Export Prompt"
          >
            <Download size={20} />
          </button>
          <label className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors cursor-pointer">
            <FileText size={20} />
            <input
              type="file"
              accept=".txt,.md"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <textarea
        value={currentPrompt}
        onChange={(e) => setCurrentPrompt(e.target.value)}
        className="w-full h-96 p-4 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200 resize-none"
        placeholder="Enter your analysis prompt..."
      />

      <p className="mt-2 text-sm text-gray-600">
        Customize the prompt to focus on specific types of inconsistencies or add domain-specific instructions.
      </p>
    </div>
  );
};

export default PromptEditor;