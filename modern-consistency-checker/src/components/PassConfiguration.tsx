import React from 'react';
import { RotateCcw, HelpCircle } from 'lucide-react';
import { useConsistencyStore } from '../store/useConsistencyStore';

const PassConfiguration: React.FC = () => {
  const { 
    numberOfPasses, 
    passStrategy, 
    setNumberOfPasses, 
    setPassStrategy 
  } = useConsistencyStore();

  const passOptions = [
    { value: 1 as const, label: '1 Pass', description: 'Standard single analysis' },
    { value: 2 as const, label: '2 Passes', description: 'More thorough, ~2x time' },
    { value: 3 as const, label: '3 Passes', description: 'Most thorough, ~3-5x time' }
  ];

  const strategyOptions = [
    { 
      value: 'union' as const, 
      label: 'Return All Found', 
      description: 'Show inconsistencies found in ANY pass (comprehensive)' 
    },
    { 
      value: 'intersection' as const, 
      label: 'Return Common Only', 
      description: 'Show only inconsistencies found in ALL passes (high confidence)' 
    }
  ];

  const getTimingEstimate = () => {
    if (numberOfPasses === 1) return '';
    
    if (passStrategy === 'union') {
      return numberOfPasses === 2 ? '~2x time' : '~3x time';
    } else {
      return numberOfPasses === 2 ? '~3x time' : '~5x time';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <RotateCcw className="mr-2" size={24} />
        Analysis Passes
      </h2>
      
      <p className="text-sm text-gray-600 mb-4">
        Multiple passes use different analysis approaches to catch more issues and reduce blind spots.
      </p>

      {/* Number of Passes */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Number of Passes
          <span className="ml-1 text-xs text-gray-500 group relative cursor-help">
            <HelpCircle size={12} className="inline" />
            <span className="invisible group-hover:visible absolute bottom-6 left-0 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
              Each pass uses randomized analysis approach
            </span>
          </span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {passOptions.map((option) => (
            <label
              key={option.value}
              className={`
                relative cursor-pointer rounded-lg border-2 p-3 transition-all text-center
                ${numberOfPasses === option.value 
                  ? 'bg-blue-50 border-blue-300 text-blue-800' 
                  : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                }
              `}
            >
              <input
                type="radio"
                name="numberOfPasses"
                value={option.value}
                checked={numberOfPasses === option.value}
                onChange={(e) => setNumberOfPasses(Number(e.target.value) as 1 | 2 | 3)}
                className="sr-only"
              />
              <div className="font-medium text-sm">{option.label}</div>
              <div className="text-xs mt-1 opacity-75">{option.description}</div>
            </label>
          ))}
        </div>
      </div>

      {/* Strategy Selection (only show if multiple passes) */}
      {numberOfPasses > 1 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Result Strategy
            <span className="ml-1 text-xs text-gray-500 group relative cursor-help">
              <HelpCircle size={12} className="inline" />
              <span className="invisible group-hover:visible absolute bottom-6 left-0 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                How to combine results from multiple passes
              </span>
            </span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {strategyOptions.map((option) => (
              <label
                key={option.value}
                className={`
                  relative cursor-pointer rounded-lg border-2 p-3 transition-all
                  ${passStrategy === option.value 
                    ? 'bg-green-50 border-green-300 text-green-800' 
                    : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                  }
                `}
              >
                <input
                  type="radio"
                  name="passStrategy"
                  value={option.value}
                  checked={passStrategy === option.value}
                  onChange={(e) => setPassStrategy(e.target.value as 'intersection' | 'union')}
                  className="sr-only"
                />
                <div className="font-medium text-sm">{option.label}</div>
                <div className="text-xs mt-1 opacity-75">{option.description}</div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Timing Warning */}
      {numberOfPasses > 1 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm text-amber-800">
            <strong>⏱️ Timing:</strong> Multiple passes take significantly longer ({getTimingEstimate()}) 
            but provide more thorough analysis and higher confidence results.
          </p>
        </div>
      )}
    </div>
  );
};

export default PassConfiguration;