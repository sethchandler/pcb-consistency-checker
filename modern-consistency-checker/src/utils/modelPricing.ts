/**
 * Model pricing data and cost calculation utilities
 */

export interface ModelPricing {
  inputCostPer1K: number;  // Cost per 1K input tokens in USD
  outputCostPer1K: number; // Cost per 1K output tokens in USD
}

// Pricing data per 1K tokens (converted from per 1M token pricing)
export const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-4o': {
    inputCostPer1K: 0.0025,   // $2.50 per 1M = $0.0025 per 1K
    outputCostPer1K: 0.01,    // $10.00 per 1M = $0.01 per 1K
  },
  'gpt-4o-mini': {
    inputCostPer1K: 0.00015,  // $0.15 per 1M = $0.00015 per 1K
    outputCostPer1K: 0.0006,  // $0.60 per 1M = $0.0006 per 1K
  },
  'gpt-4.1-mini': {
    inputCostPer1K: 0.0004,   // $0.40 per 1M = $0.0004 per 1K
    outputCostPer1K: 0.0016,  // $1.60 per 1M = $0.0016 per 1K
  },
  'gpt-4.1-nano': {
    inputCostPer1K: 0.0001,   // $0.10 per 1M = $0.0001 per 1K
    outputCostPer1K: 0.0004,  // $0.40 per 1M = $0.0004 per 1K
  },
  'gpt-3.5-turbo': {
    inputCostPer1K: 0.0005,   // $0.50 per 1M = $0.0005 per 1K
    outputCostPer1K: 0.0015,  // $1.50 per 1M = $0.0015 per 1K
  },
};

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Calculate the cost of an API call based on token usage
 */
export function calculateCost(
  model: string,
  usage: TokenUsage
): number {
  const pricing = MODEL_PRICING[model];
  
  if (!pricing) {
    console.warn(`Pricing not found for model: ${model}`);
    return 0;
  }

  const inputCost = (usage.promptTokens / 1000) * pricing.inputCostPer1K;
  const outputCost = (usage.completionTokens / 1000) * pricing.outputCostPer1K;
  
  return inputCost + outputCost;
}

/**
 * Format cost as a currency string
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(5)}`;
}

/**
 * Get the pricing info for a model (for display purposes)
 */
export function getModelPricingDisplay(model: string): string {
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    return 'Pricing unavailable';
  }
  
  const inputPer1M = (pricing.inputCostPer1K * 1000).toFixed(2);
  const outputPer1M = (pricing.outputCostPer1K * 1000).toFixed(2);
  
  return `$${inputPer1M}/$${outputPer1M} per 1M tokens`;
}