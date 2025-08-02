import React from 'react';
import { DollarSign, RotateCcw } from 'lucide-react';
import { useConsistencyStore } from '../store/useConsistencyStore';
import { formatCost } from '../utils/modelPricing';

const CostTracker: React.FC = () => {
  const { sessionCost, totalTokensUsed, resetSessionCost } = useConsistencyStore();

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <DollarSign className="text-green-600" size={16} />
          <div className="text-sm">
            <div className="flex items-center space-x-4">
              <div>
                <span className="text-gray-600">Session Cost: </span>
                <span className="font-semibold text-green-700">
                  {formatCost(sessionCost)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Tokens: </span>
                <span className="font-medium text-gray-700">
                  {totalTokensUsed.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <button
          onClick={resetSessionCost}
          className="flex items-center text-xs text-gray-500 hover:text-gray-700 transition-colors"
          title="Reset session cost tracking"
        >
          <RotateCcw size={12} className="mr-1" />
          Reset
        </button>
      </div>
    </div>
  );
};

export default CostTracker;