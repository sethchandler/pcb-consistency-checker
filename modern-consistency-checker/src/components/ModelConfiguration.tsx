import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Cpu, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useConsistencyStore } from '../store/useConsistencyStore';
import { PROVIDERS_CONFIG, isValidApiKey, testOllamaConnection } from '../utils/modelProviders';

const ModelConfiguration: React.FC = () => {
  const { 
    apiKey, 
    setApiKey, 
    selectedProvider,
    setSelectedProvider,
    selectedModel, 
    setSelectedModel 
  } = useConsistencyStore();
  
  const [showKey, setShowKey] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<{connected: boolean; models?: string[]; error?: string} | null>(null);
  const [isTestingOllama, setIsTestingOllama] = useState(false);

  // Test Ollama connection when provider changes to Ollama
  useEffect(() => {
    if (selectedProvider === 'ollama') {
      testOllamaConnectionHandler();
    }
  }, [selectedProvider]);

  const testOllamaConnectionHandler = async () => {
    setIsTestingOllama(true);
    try {
      const result = await testOllamaConnection();
      setOllamaStatus(result);
    } catch (error) {
      setOllamaStatus({ connected: false, error: 'Failed to test connection' });
    } finally {
      setIsTestingOllama(false);
    }
  };

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    // Set default model for the new provider
    const providerConfig = PROVIDERS_CONFIG[provider];
    if (providerConfig) {
      setSelectedModel(providerConfig.defaultModel);
    }
  };

  const provider = PROVIDERS_CONFIG[selectedProvider];
  const isValid = provider?.requiresApiKey ? isValidApiKey(selectedProvider, apiKey) : true;
  const showApiKeyInput = provider?.requiresApiKey;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <Cpu className="mr-2" size={24} />
        AI Model Configuration
      </h2>

      <div className="space-y-4">
        {/* Provider Selection */}
        <div>
          <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-2">
            AI Provider
          </label>
          <select
            id="provider"
            value={selectedProvider}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200"
          >
            {Object.entries(PROVIDERS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>

        {/* API Key Input (conditional) */}
        {showApiKeyInput && (
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
                placeholder={selectedProvider === 'gemini' ? 'Your Google Gemini API key' : 'sk-...'}
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
                Invalid API key format for {provider?.label}
              </p>
            )}
            {isValid && (
              <p className="mt-1 text-sm text-green-600">
                ✓ Valid API key format
              </p>
            )}
          </div>
        )}

        {/* Ollama Setup Information */}
        {selectedProvider === 'ollama' && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start space-x-2">
              <AlertCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Local Privacy Mode</p>
                <p className="text-xs mb-2">
                  Ollama runs models locally on your computer. No data is sent to external servers.
                </p>
                {ollamaStatus && (
                  <div className={`mt-2 p-2 rounded ${ollamaStatus.connected ? 'bg-green-100' : 'bg-orange-100'}`}>
                    {ollamaStatus.connected ? (
                      <div className="flex items-center text-green-800">
                        <CheckCircle size={14} className="mr-1" />
                        <span className="text-xs">
                          Connected! {ollamaStatus.models?.length || 0} models available
                        </span>
                      </div>
                    ) : (
                      <div className="text-orange-800">
                        <div className="flex items-center mb-1">
                          <AlertCircle size={14} className="mr-1" />
                          <span className="text-xs font-medium">Not connected</span>
                        </div>
                        <p className="text-xs">
                          Install Ollama from <a 
                            href="https://ollama.ai" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            ollama.ai
                          </a> and ensure it's running.
                        </p>
                        {ollamaStatus.models && ollamaStatus.models.length > 0 && (
                          <p className="text-xs mt-1">
                            Available models: {ollamaStatus.models.join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={testOllamaConnectionHandler}
                  disabled={isTestingOllama}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline flex items-center"
                >
                  {isTestingOllama ? (
                    <>
                      <Loader size={12} className="animate-spin mr-1" />
                      Testing connection...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Model Selection */}
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
            {provider?.models.map((model) => {
              const pricing = model.pricing.inputPerMillionTokens === 0 
                ? 'Free (Local)' 
                : `$${model.pricing.inputPerMillionTokens}/$${model.pricing.outputPerMillionTokens} per 1M tokens`;
              
              return (
                <option key={model.name} value={model.name}>
                  {model.displayName} ({pricing})
                </option>
              );
            })}
          </select>
        </div>

        {/* Provider-specific notes */}
        <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-md">
          <p className="font-medium">Note:</p>
          {selectedProvider === 'openai' && (
            <p>Your OpenAI API key is stored only in your browser and never sent to any server.</p>
          )}
          {selectedProvider === 'gemini' && (
            <p>Your Google Gemini API key is stored only in your browser. Get your key from the <a 
              href="https://makersuite.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline text-blue-600"
            >
              Google AI Studio
            </a>.</p>
          )}
          {selectedProvider === 'ollama' && (
            <p>All processing happens locally on your machine. No API key required.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelConfiguration;