import { analyzeConsistency } from './consistencyCheckWrapper';
import { calculateCost } from './modelPricing';
import type { TokenUsage } from '../types';

/**
 * Generate randomized prompt prefix for varied analysis approaches
 */
function generateRandomPromptPrefix(passNumber: number, totalPasses: number): string {
  const timestamp = Date.now();
  const randomSeed = Math.floor(Math.random() * 10000);
  
  const focusAreas = [
    'temporal and chronological aspects',
    'numerical values and quantities', 
    'geographical locations and places',
    'participant names and identities',
    'document references and citations'
  ];
  
  const analysisOrders = [
    'starting with the first document and proceeding sequentially',
    'beginning with the last document and working backwards',
    'starting with the middle document and expanding outward',
    'examining the longest document first',
    'reviewing the shortest documents initially'
  ];
  
  const focusArea = focusAreas[passNumber % focusAreas.length];
  const analysisOrder = analysisOrders[passNumber % analysisOrders.length];
  
  return `ANALYSIS RANDOMIZATION SEED: ${timestamp}-${randomSeed}
PASS ${passNumber} OF ${totalPasses}: Use a fresh analytical approach. Focus initially on ${focusArea}, then expand systematically. Begin by ${analysisOrder}.

CRITICAL: This is an independent analysis pass. Do not reference any previous analyses. Use varied reasoning patterns to prevent analytical blind spots.

`;
}

/**
 * Merge two analysis results using intersection strategy
 */
async function mergeIntersectionResults(
  resultA: string, 
  resultB: string,
  apiKey: string,
  selectedModel: string
): Promise<{ content: string; usage?: TokenUsage; cost: number }> {
  const mergePrompt = `You are analyzing two independent consistency analysis results. Return ONLY the inconsistencies that appear in BOTH analyses.

ANALYSIS A:
${resultA}

ANALYSIS B:
${resultB}

Instructions:
1. Compare the two analyses and identify inconsistencies that appear in BOTH
2. An inconsistency "appears in both" if the same factual conflict is identified, even if worded differently
3. Return results in the exact same markdown table format as the original analyses
4. Include the same columns: Sources of Conflict, Nature of Inconsistency, Recommended Fix
5. If no inconsistencies appear in both analyses, return an empty table with just headers

Return only the unified table - no additional explanation or commentary.`;

  try {
    const result = await analyzeConsistency({
      prompt: mergePrompt,
      content: '', // Content is already in the prompt
      apiKey,
      model: selectedModel,
      outputFormat: 'markdown'
    });

    if (!result.success) {
      throw new Error(result.error || 'Merge analysis failed');
    }

    let cost = 0;
    let usage: TokenUsage | undefined;
    
    if (result.usage) {
      usage = {
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens
      };
      cost = calculateCost(selectedModel, usage);
    }

    return {
      content: result.rawResponse || '',
      usage,
      cost
    };
  } catch (error) {
    console.error('Merge analysis failed:', error);
    throw error;
  }
}

/**
 * Simple client-side union of multiple analysis results
 */
function mergeUnionResults(results: string[]): string {
  // For union strategy, we simply concatenate all tables
  // In a more sophisticated implementation, we could deduplicate similar inconsistencies
  
  const allTables = results
    .map(result => {
      // Extract just the table portion from each result
      const tableMatch = result.match(/\|[\s\S]*?\|[\s\S]*?\|[\s\S]*?\|[\s\S]*?(?=\n\n|$)/);
      return tableMatch ? tableMatch[0] : '';
    })
    .filter(table => table.trim())
    .filter((table, index, arr) => arr.indexOf(table) === index); // Basic deduplication
  
  if (allTables.length === 0) {
    return '| Sources of Conflict | Nature of Inconsistency | Recommended Fix |\n|---|---|---|\n';
  }
  
  // Combine all tables, keeping only one header
  const header = '| Sources of Conflict | Nature of Inconsistency | Recommended Fix |\n|---|---|---|';
  const allRows = allTables
    .map(table => {
      const lines = table.split('\n');
      // Skip header and separator lines, keep only data rows
      return lines.slice(2).filter(line => line.trim() && line.includes('|'));
    })
    .flat();
    
  return header + '\n' + allRows.join('\n');
}

/**
 * Run multi-pass analysis with progress callbacks
 */
export async function runMultiPassAnalysis(
  basePrompt: string,
  content: string,
  apiKey: string,
  selectedModel: string,
  numberOfPasses: number,
  strategy: 'intersection' | 'union',
  onProgress: (stage: string, passNumber?: number, totalPasses?: number) => void,
  onCostUpdate: (cost: number, tokens: number) => void
): Promise<{ content: string; totalCost: number; totalTokens: number }> {
  
  let totalCost = 0;
  let totalTokens = 0;
  
  if (numberOfPasses === 1) {
    // Single pass - no special handling needed
    onProgress('Running analysis...');
    
    const result = await analyzeConsistency({
      prompt: basePrompt,
      content,
      apiKey,
      model: selectedModel,
      outputFormat: 'markdown'
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Analysis failed');
    }
    
    if (result.usage) {
      const cost = calculateCost(selectedModel, result.usage);
      totalCost = cost;
      totalTokens = result.usage.totalTokens;
      onCostUpdate(cost, result.usage.totalTokens);
    }
    
    return {
      content: result.rawResponse || '',
      totalCost,
      totalTokens
    };
  }
  
  // Multi-pass analysis
  const analysisResults: string[] = [];
  let mergedResult = '';
  
  for (let pass = 1; pass <= numberOfPasses; pass++) {
    onProgress('Running analysis pass', pass, numberOfPasses);
    
    // Generate randomized prompt for this pass
    const randomPrefix = generateRandomPromptPrefix(pass, numberOfPasses);
    const randomizedPrompt = randomPrefix + basePrompt;
    
    // Run the analysis for this pass
    const result = await analyzeConsistency({
      prompt: randomizedPrompt,
      content,
      apiKey,
      model: selectedModel,
      outputFormat: 'markdown'
    });
    
    if (!result.success) {
      console.warn(`Pass ${pass} failed: ${result.error}`);
      continue; // Continue with other passes
    }
    
    // Track cost
    if (result.usage) {
      const cost = calculateCost(selectedModel, result.usage);
      totalCost += cost;
      totalTokens += result.usage.totalTokens;
      onCostUpdate(cost, result.usage.totalTokens);
    }
    
    const passResult = result.rawResponse || '';
    analysisResults.push(passResult);
    
    // For intersection strategy, merge progressively
    if (strategy === 'intersection' && analysisResults.length >= 2) {
      onProgress('Merging results', pass, numberOfPasses);
      
      const previousResult = mergedResult || analysisResults[analysisResults.length - 2];
      const currentResult = analysisResults[analysisResults.length - 1];
      
      try {
        const merged = await mergeIntersectionResults(
          previousResult,
          currentResult,
          apiKey,
          selectedModel
        );
        
        mergedResult = merged.content;
        totalCost += merged.cost;
        if (merged.usage) {
          totalTokens += merged.usage.totalTokens;
          onCostUpdate(merged.cost, merged.usage.totalTokens);
        }
      } catch (error) {
        console.error(`Failed to merge pass ${pass}:`, error);
        // Fall back to using just the current result
        mergedResult = currentResult;
      }
    }
  }
  
  // Final result processing
  let finalContent: string;
  
  if (strategy === 'union') {
    // Union: combine all results client-side
    finalContent = mergeUnionResults(analysisResults);
  } else {
    // Intersection: use the progressively merged result
    finalContent = mergedResult || (analysisResults.length > 0 ? analysisResults[0] : '');
  }
  
  return {
    content: finalContent,
    totalCost,
    totalTokens
  };
}