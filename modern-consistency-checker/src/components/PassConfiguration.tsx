import React, { useState } from 'react';
import { RotateCcw, HelpCircle, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { useConsistencyStore } from '../store/useConsistencyStore';

const PassConfiguration: React.FC = () => {
  const { 
    numberOfPasses, 
    passStrategy, 
    temperatureSettings,
    setNumberOfPasses, 
    setPassStrategy,
    setTemperatureSettings
  } = useConsistencyStore();
  
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Smart temperature defaults based on strategy
  const getSmartDefaults = (strategy: 'union' | 'intersection') => {
    if (strategy === 'union') {
      return {
        singlePass: 0.7,  // High creativity for finding diverse inconsistencies
        multiPass: 0.8,   // Even more diversity across passes
        merge: 0.4        // Not used in union, but reasonable default
      };
    } else {
      return {
        singlePass: 0.3,  // Consistent baseline
        multiPass: 0.2,   // Very consistent for matching
        merge: 0.1        // Ultra-consistent for reliable merging
      };
    }
  };

  // Apply smart defaults when strategy changes
  const handleStrategyChange = (newStrategy: 'union' | 'intersection') => {
    setPassStrategy(newStrategy);
    const smartDefaults = getSmartDefaults(newStrategy);
    setTemperatureSettings(smartDefaults);
  };

  const passOptions = [
    { value: 1 as const, label: '1 Pass', description: 'Standard single analysis' },
    { value: 2 as const, label: '2 Passes', description: 'More thorough, ~2x time' },
    { value: 3 as const, label: '3 Passes', description: 'Most thorough, ~3-5x time' }
  ];

  const strategyOptions = [
    { 
      value: 'union' as const, 
      label: 'Return All Found', 
      description: 'Show inconsistencies found in ANY pass (comprehensive but likely to result in duplicated fixes)' 
    },
    { 
      value: 'intersection' as const, 
      label: 'Return Common Only', 
      description: 'Show only inconsistencies found in ALL passes (avoids duplicate fixes but likely to be underinclusive)' 
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
                  onChange={(e) => handleStrategyChange(e.target.value as 'intersection' | 'union')}
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

      {/* Advanced Temperature Controls */}
      <div className="mt-4 border-t border-gray-200 pt-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors w-full"
        >
          {showAdvanced ? (
            <ChevronDown className="mr-2" size={16} />
          ) : (
            <ChevronRight className="mr-2" size={16} />
          )}
          <Settings className="mr-2" size={16} />
          Advanced Temperature Settings
          <span className="ml-1 text-xs text-gray-500 group relative cursor-help">
            <HelpCircle size={12} className="inline" />
            <span className="invisible group-hover:visible absolute bottom-6 left-0 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
              Control AI creativity vs consistency
            </span>
          </span>
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 bg-gray-50 rounded-lg p-4">
            {/* Expert Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <div className="flex items-start">
                <HelpCircle className="h-4 w-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-xs text-yellow-800">
                  <strong>⚠️ Advanced: Temperature settings affect analysis quality.</strong><br />
                  Only modify if you understand the trade-offs. Values auto-adjust when you change strategy above.
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-600 mb-3">
              <strong>Current Strategy Impact:</strong><br />
              {passStrategy === 'union' 
                ? 'Union (Return All): Higher temps for diverse, creative inconsistency detection'
                : 'Intersection (Common Only): Lower temps for consistent, reliable consensus'
              }
            </div>

            <p className="text-xs text-gray-600 mb-3">
              Lower values (0.0-0.3) = More consistent, focused results<br />
              Higher values (0.7-1.0) = More creative, varied results
            </p>

            {/* Single Pass Temperature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Single Pass Temperature: {temperatureSettings.singlePass.toFixed(1)}
                <span className="ml-1 text-xs text-gray-500 group relative cursor-help">
                  <HelpCircle size={12} className="inline" />
                  <span className="invisible group-hover:visible absolute bottom-6 left-0 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    Temperature for single-pass analysis
                  </span>
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperatureSettings.singlePass}
                onChange={(e) => setTemperatureSettings({
                  ...temperatureSettings,
                  singlePass: parseFloat(e.target.value)
                })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Multi Pass Temperature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Multi Pass Temperature: {temperatureSettings.multiPass.toFixed(1)}
                <span className="ml-1 text-xs text-gray-500 group relative cursor-help">
                  <HelpCircle size={12} className="inline" />
                  <span className="invisible group-hover:visible absolute bottom-6 left-0 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    Temperature for each individual pass in multi-pass analysis
                  </span>
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperatureSettings.multiPass}
                onChange={(e) => setTemperatureSettings({
                  ...temperatureSettings,
                  multiPass: parseFloat(e.target.value)
                })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Merge Temperature */}
            {numberOfPasses > 1 && passStrategy === 'intersection' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Merge Temperature: {temperatureSettings.merge.toFixed(1)}
                  <span className="ml-1 text-xs text-gray-500 group relative cursor-help">
                    <HelpCircle size={12} className="inline" />
                    <span className="invisible group-hover:visible absolute bottom-6 left-0 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                      Temperature for merging results in intersection strategy
                    </span>
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperatureSettings.merge}
                  onChange={(e) => setTemperatureSettings({
                    ...temperatureSettings,
                    merge: parseFloat(e.target.value)
                  })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}

            {/* Reset to Smart Defaults */}
            <button
              onClick={() => setTemperatureSettings(getSmartDefaults(passStrategy))}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Reset to smart defaults for {passStrategy === 'union' ? 'Union' : 'Intersection'} strategy
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PassConfiguration;