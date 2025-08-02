import React, { useState } from 'react';
import { Key, Eye, EyeOff } from 'lucide-react';
import { useConsistencyStore } from '../store/useConsistencyStore';
import { isValidAPIKey } from '../utils/consistencyCheckWrapper';

const ApiKeyInput: React.FC = () => {
  const { apiKey, setApiKey, selectedModel, setSelectedModel } = useConsistencyStore();
  const [showKey, setShowKey] = useState(false);

  const models = [
    { value: 'gpt-4o', label: 'GPT-4o', price: '$2.50/$10.00 per 1M tokens' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', price: '$0.15/$0.60 per 1M tokens' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', price: '$0.40/$1.60 per 1M tokens' },
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', price: '$0.10/$0.40 per 1M tokens' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', price: '$0.50/$1.50 per 1M tokens' },
  ];

  const isValid = isValidAPIKey(apiKey);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <Key className="mr-2" size={24} />
        OpenAI API Configuration
      </h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 mb-2">
            API Key
          </label>
          <div className="relative">
            <input
              id="api-key"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className={`
                w-full px-4 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2
                ${isValid 
                  ? 'border-green-300 focus:border-green-500 focus:ring-green-200' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                }
              `}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
            >
              {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {apiKey && !isValid && (
            <p className="mt-1 text-sm text-red-600">
              Invalid API key format. Should start with "sk-"
            </p>
          )}
          {isValid && (
            <p className="mt-1 text-sm text-green-600">
              ✓ Valid API key format
            </p>
          )}
        </div>

        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
            AI Model
          </label>
          <select
            id="model"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200"
          >
            {models.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label} ({model.price})
              </option>
            ))}
          </select>
        </div>

        <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-md">
          <p className="font-medium">Note:</p>
          <p>Your API key is stored only in your browser and never sent to any server.</p>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyInput;