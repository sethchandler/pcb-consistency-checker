import React from 'react';
import { AlertTriangle, Scale, Shield } from 'lucide-react';
import { useConsistencyStore } from '../store/useConsistencyStore';

type EmphasisType = 'avoid-false-negatives' | 'neutral' | 'avoid-false-positives';

const AnalysisEmphasis: React.FC = () => {
  const { analysisEmphasis, setAnalysisEmphasis } = useConsistencyStore();

  const emphasisOptions = [
    {
      value: 'avoid-false-negatives' as EmphasisType,
      label: 'Avoid False Negatives',
      description: 'Catch more potential issues (may flag some non-issues)',
      icon: AlertTriangle,
      color: 'text-red-800',
      bg: 'bg-red-200 border-red-400'
    },
    {
      value: 'neutral' as EmphasisType, 
      label: 'Neutral',
      description: 'Balanced approach to inconsistency detection',
      icon: Scale,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200'
    },
    {
      value: 'avoid-false-positives' as EmphasisType,
      label: 'Avoid False Positives', 
      description: 'Only flag clear, definitive inconsistencies',
      icon: Shield,
      color: 'text-green-800',
      bg: 'bg-green-200 border-green-400'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <Scale className="mr-2" size={24} />
        Analysis Emphasis
      </h2>
      
      <p className="text-sm text-gray-600 mb-4">
        Choose how sensitive the AI should be when detecting inconsistencies:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {emphasisOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = analysisEmphasis === option.value;
          
          return (
            <label
              key={option.value}
              className={`
                relative cursor-pointer rounded-lg border-2 p-4 transition-all
                ${isSelected 
                  ? `${option.bg} border-current` 
                  : 'bg-white border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <input
                type="radio"
                name="analysis-emphasis"
                value={option.value}
                checked={isSelected}
                onChange={(e) => setAnalysisEmphasis(e.target.value as EmphasisType)}
                className="sr-only"
              />
              
              <div className="flex items-start space-x-3">
                <Icon 
                  className={isSelected ? option.color : 'text-gray-400'} 
                  size={20} 
                />
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${isSelected ? option.color : 'text-gray-900'}`}>
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {option.description}
                  </div>
                </div>
              </div>
              
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className={`w-2 h-2 rounded-full ${option.color.replace('text-', 'bg-')}`} />
                </div>
              )}
            </label>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-xs text-yellow-800">
          <strong>Note:</strong> This setting affects how the AI interprets ambiguous situations. 
          Choose "Avoid False Negatives" for thorough review, "Avoid False Positives" for high confidence findings only.
        </p>
      </div>
    </div>
  );
};

export default AnalysisEmphasis;