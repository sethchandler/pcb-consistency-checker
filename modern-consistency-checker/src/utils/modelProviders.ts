// Model provider configurations and API implementations

export interface ModelProvider {
  id: string;
  label: string;
  requiresApiKey: boolean;
  requiresSetup?: boolean;
  models: ModelConfig[];
  defaultModel: string;
}

export interface ModelConfig {
  name: string;
  displayName: string;
  pricing: {
    inputPerMillionTokens: number;
    outputPerMillionTokens: number;
  };
}

export const PROVIDERS_CONFIG: Record<string, ModelProvider> = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    requiresApiKey: true,
    models: [
      { 
        name: 'gpt-4o', 
        displayName: 'GPT-4o',
        pricing: { inputPerMillionTokens: 2.50, outputPerMillionTokens: 10.00 } 
      },
      { 
        name: 'gpt-4o-mini', 
        displayName: 'GPT-4o Mini',
        pricing: { inputPerMillionTokens: 0.15, outputPerMillionTokens: 0.60 } 
      },
      { 
        name: 'gpt-4.1-mini', 
        displayName: 'GPT-4.1 Mini',
        pricing: { inputPerMillionTokens: 0.40, outputPerMillionTokens: 1.60 } 
      },
      { 
        name: 'gpt-4.1-nano', 
        displayName: 'GPT-4.1 Nano',
        pricing: { inputPerMillionTokens: 0.10, outputPerMillionTokens: 0.40 } 
      },
      { 
        name: 'gpt-3.5-turbo', 
        displayName: 'GPT-3.5 Turbo',
        pricing: { inputPerMillionTokens: 0.50, outputPerMillionTokens: 1.50 } 
      },
    ],
    defaultModel: 'gpt-4o-mini',
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    requiresApiKey: true,
    models: [
      { 
        name: 'gemini-2.5-flash', 
        displayName: 'Gemini 2.5 Flash',
        pricing: { inputPerMillionTokens: 0.35, outputPerMillionTokens: 0.70 } 
      },
      { 
        name: 'gemini-2.5-pro', 
        displayName: 'Gemini 2.5 Pro',
        pricing: { inputPerMillionTokens: 3.50, outputPerMillionTokens: 10.50 } 
      }
    ],
    defaultModel: 'gemini-2.5-flash',
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama (Local - Privacy Mode)',
    requiresApiKey: false,
    requiresSetup: true,
    models: [
      { 
        name: 'llama3:latest', 
        displayName: 'Llama 3 (Latest)',
        pricing: { inputPerMillionTokens: 0, outputPerMillionTokens: 0 } 
      },
      { 
        name: 'llama3.1:8b', 
        displayName: 'Llama 3.1 8B',
        pricing: { inputPerMillionTokens: 0, outputPerMillionTokens: 0 } 
      },
      { 
        name: 'mistral:latest', 
        displayName: 'Mistral (Latest)',
        pricing: { inputPerMillionTokens: 0, outputPerMillionTokens: 0 } 
      },
      { 
        name: 'gemma:latest', 
        displayName: 'Gemma (Latest)',
        pricing: { inputPerMillionTokens: 0, outputPerMillionTokens: 0 } 
      }
    ],
    defaultModel: 'llama3:latest',
  },
};

export interface ApiResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

// API implementation for OpenAI
async function callOpenAI(
  apiKey: string, 
  model: string, 
  messages: Array<{role: string; content: string}>,
  temperature: number = 0.3
): Promise<ApiResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${apiKey}` 
    },
    body: JSON.stringify({ 
      model, 
      messages,
      temperature
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData?.error?.message || response.statusText;
    
    if (response.status === 401) {
      throw new Error('Invalid OpenAI API key');
    } else if (response.status === 429) {
      throw new Error('OpenAI rate limit exceeded. Please try again later.');
    } else if (response.status >= 500) {
      throw new Error('OpenAI server error. Please try again.');
    } else {
      throw new Error(`OpenAI API error: ${errorMsg}`);
    }
  }
  
  const data = await response.json();
  
  if (!data.choices || data.choices.length === 0) {
    throw new Error('Invalid response from OpenAI: no choices returned');
  }
  
  return {
    content: data.choices[0].message.content,
    usage: data.usage ? {
      inputTokens: data.usage.prompt_tokens || 0,
      outputTokens: data.usage.completion_tokens || 0,
      totalTokens: data.usage.total_tokens || 0
    } : undefined
  };
}

// API implementation for Google Gemini
async function callGemini(
  apiKey: string, 
  model: string, 
  messages: Array<{role: string; content: string}>,
  temperature: number = 0.3
): Promise<ApiResponse> {
  // Format messages for Gemini API
  const formattedMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content }]
    }));
    
  const systemInstruction = messages.find(m => m.role === 'system');
  
  const body = {
    contents: formattedMessages,
    generationConfig: {
      temperature,
    },
    ...(systemInstruction && { 
      systemInstruction: { 
        parts: [{ text: systemInstruction.content }] 
      } 
    })
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, 
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData?.error?.message || `API request failed with status ${response.status}.`;
    
    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid Google Gemini API key or access denied');
    } else if (response.status === 429) {
      throw new Error('Google Gemini rate limit exceeded. Please try again later.');
    } else if (response.status >= 500) {
      throw new Error('Google Gemini server error. Please try again.');
    } else {
      throw new Error(`Google Gemini API error: ${errorMsg}`);
    }
  }

  const data = await response.json();

  if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
    let reason = 'The model returned an empty or invalid response.';
    if (data.promptFeedback?.blockReason) {
      reason = `Content blocked by safety settings: ${data.promptFeedback.blockReason}.`;
    } else if (data.candidates?.[0]?.finishReason) {
      reason = `Generation stopped. Reason: ${data.candidates[0].finishReason}.`;
    }
    throw new Error(reason);
  }

  const usage = data.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
  
  return {
    content: data.candidates[0].content.parts[0].text,
    usage: {
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      totalTokens: (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0)
    }
  };
}

// API implementation for Ollama (local)
async function callOllama(
  model: string, 
  messages: Array<{role: string; content: string}>,
  temperature: number = 0.3
): Promise<ApiResponse> {
  try {
    const response = await fetch('http://localhost:11434/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model, 
        messages, 
        stream: false,
        temperature
      }),
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Model '${model}' not found in Ollama. Please pull the model first using: ollama pull ${model}`);
      } else {
        throw new Error(`Ollama server error (${response.status}): ${response.statusText}`);
      }
    }
    
    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('Invalid response from Ollama: no choices returned');
    }
    
    return {
      content: data.choices[0].message.content,
      usage: data.usage ? {
        inputTokens: data.usage.prompt_tokens || 0,
        outputTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0
      } : undefined
    };
  } catch (error: any) {
    if (error instanceof TypeError || error.name === 'NetworkError' || error.message.includes('fetch')) {
      throw new Error('Cannot connect to Ollama. Please ensure it is installed and running on localhost:11434. Install from: https://ollama.ai');
    }
    throw error;
  }
}

// Test Ollama connection
export async function testOllamaConnection(): Promise<{connected: boolean; models?: string[]; error?: string}> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) {
      return { connected: false, error: 'Ollama server responded with an error.' };
    }
    const data = await response.json();
    const modelNames = data.models?.map((m: any) => m.name) || [];
    return { connected: true, models: modelNames };
  } catch (error) {
    return { 
      connected: false, 
      error: 'Cannot connect to Ollama. Please ensure it is installed and running.' 
    };
  }
}

// Main API call function
export async function callLlmApi(
  providerId: string,
  apiKey: string | null,
  model: string,
  messages: Array<{role: string; content: string}>,
  temperature: number = 0.3
): Promise<ApiResponse> {
  // Validate provider
  if (!PROVIDERS_CONFIG[providerId]) {
    throw new Error(`Provider "${providerId}" is not supported`);
  }
  
  // Validate model
  const providerConfig = PROVIDERS_CONFIG[providerId];
  if (!providerConfig.models.some(m => m.name === model)) {
    throw new Error(`Model "${model}" is not available for provider "${providerId}"`);
  }
  
  // Call appropriate API based on provider
  switch (providerId) {
    case 'openai':
      if (!apiKey) throw new Error('OpenAI API key is required');
      return await callOpenAI(apiKey, model, messages, temperature);
      
    case 'gemini':
      if (!apiKey) throw new Error('Google Gemini API key is required');
      return await callGemini(apiKey, model, messages, temperature);
      
    case 'ollama':
      // No API key needed for local Ollama
      return await callOllama(model, messages, temperature);
      
    default:
      throw new Error(`Provider "${providerId}" is not implemented`);
  }
}

// Calculate cost based on token usage
export function calculateCost(
  providerId: string, 
  model: string, 
  inputTokens: number, 
  outputTokens: number
): number {
  const provider = PROVIDERS_CONFIG[providerId];
  if (!provider) return 0;
  
  const modelConfig = provider.models.find(m => m.name === model);
  if (!modelConfig) return 0;
  
  const inputCost = (inputTokens / 1_000_000) * modelConfig.pricing.inputPerMillionTokens;
  const outputCost = (outputTokens / 1_000_000) * modelConfig.pricing.outputPerMillionTokens;
  
  return inputCost + outputCost;
}

// Validate API key format
export function isValidApiKey(providerId: string, apiKey: string): boolean {
  if (!apiKey || !apiKey.trim()) return false;
  
  switch (providerId) {
    case 'openai':
      return apiKey.trim().startsWith('sk-') && apiKey.trim().length > 20;
    case 'gemini':
      // Gemini API keys are typically 39 characters long
      return apiKey.trim().length >= 35 && apiKey.trim().length <= 45;
    case 'ollama':
      // No API key needed for Ollama
      return true;
    default:
      return false;
  }
}