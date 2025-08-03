import { callLlmApi, calculateCost } from './modelProviders';
import { tfIdfMerge, simpleUnionMerge } from './tfIdfMerge';

/**
 * Clean content to extract just the markdown table
 */
export function cleanTableContent(content: string): string {
  // Extract just the table from the content
  const tableMatch = content.match(/\|[\s\S]*?\|[\s\S]*?\|[\s\S]*?\|[\s\S]*?\|[\s\S]*?(?=\n\n|$)/);
  return tableMatch ? tableMatch[0] : content;
}

/**
 * Generate randomized prompt prefix for varied analysis approaches
 */
function generateRandomPromptPrefix(passNumber: number, totalPasses: number): string {
  const timestamp = Date.now();
  const randomSeed = Math.floor(Math.random() * 10000);
  
  const focusAreas = [
    'temporal and chronological inconsistencies',
    'numerical discrepancies and quantitative conflicts', 
    'geographical and locational contradictions',
    'participant names, identities, and personal details',
    'documentary evidence and citation conflicts',
    'financial amounts, payments, and monetary inconsistencies',
    'procedural and process-related contradictions',
    'communication records and correspondence conflicts'
  ];
  
  const analysisStrategies = [
    'Start with the most recent documents and trace backwards chronologically',
    'Begin with official documents (contracts, reports) then compare with testimonies',
    'Focus on witness statements first, then verify against documentary evidence',
    'Examine financial records initially, then cross-reference with other sources',
    'Start with the longest, most detailed document and use it as a baseline',
    'Begin with documents that mention specific dates, times, or numbers',
    'Prioritize documents with the most participants or stakeholders mentioned',
    'Start with the shortest documents to identify key conflict areas quickly'
  ];
  
  const reasoningApproaches = [
    'Use systematic fact-checking methodology',
    'Apply forensic accounting principles to financial discrepancies',
    'Employ timeline reconstruction techniques',
    'Use cross-reference validation methods',
    'Apply legal document analysis standards',
    'Use investigative journalism fact-verification approaches',
    'Apply academic research verification protocols',
    'Use auditing and compliance checking methodologies'
  ];
  
  const attentionPrompts = [
    'Pay special attention to subtle wording differences that might indicate conflicts',
    'Focus particularly on implied information versus explicitly stated facts',
    'Examine metadata, dates, and contextual clues for hidden inconsistencies',
    'Look for patterns of systematic inconsistency across multiple documents',
    'Consider whether apparent agreements might mask underlying contradictions',
    'Analyze the reliability and potential bias of each information source',
    'Examine the logical consistency of cause-and-effect relationships',
    'Focus on quantifiable facts that can be objectively verified or contradicted'
  ];
  
  // Use different combinations to ensure substantial variation
  const focusArea = focusAreas[(passNumber + randomSeed) % focusAreas.length];
  const strategy = analysisStrategies[(passNumber * 3 + randomSeed) % analysisStrategies.length];
  const reasoning = reasoningApproaches[(passNumber * 7 + randomSeed) % reasoningApproaches.length];
  const attention = attentionPrompts[(passNumber * 11 + randomSeed) % attentionPrompts.length];
  
  return `ANALYSIS VARIATION ID: ${timestamp}-${randomSeed}-P${passNumber}

PASS ${passNumber} OF ${totalPasses} - INDEPENDENT ANALYTICAL APPROACH:

PRIMARY FOCUS: Concentrate specifically on ${focusArea}.

ANALYSIS STRATEGY: ${strategy}

REASONING METHODOLOGY: ${reasoning}

ATTENTION DIRECTIVE: ${attention}

CRITICAL INDEPENDENCE REQUIREMENT: This is a completely independent analysis. Do not reference, assume, or build upon any previous analyses. Use fresh eyes and a different analytical lens. Approach this as if you've never seen these documents before.

ANALYTICAL DIVERSITY MANDATE: Employ a distinctly different reasoning pattern from what a previous analyst might have used. Question assumptions that might seem obvious. Look for inconsistencies that could be missed by conventional analysis approaches.

`;
}

/**
 * Merge two analysis results using TF-IDF based intersection strategy
 */
interface MergeReasoning {
  totalRowsA?: number;
  totalRowsB?: number;
  matchesFound?: number;
  theta?: number;
  approach?: string;
  matchDetails?: Array<{
    similarity: number;
    rowA: any;
    rowB: any;
  }>;
  finalDecision?: string;
}

function mergeIntersectionResults(
  resultA: string, 
  resultB: string,
  theta: number
): { content: string; reasoning?: MergeReasoning; cost: number } {
  // Use TF-IDF merge instead of LLM
  const mergeResult = tfIdfMerge(resultA, resultB, theta);
  
  // Parse the tables to get row counts for reasoning
  const tableA = mergeResult.content.split('\n').filter(line => line.startsWith('|') && !line.includes('---|')).length - 1;
  const tableB = resultB.split('\n').filter(line => line.startsWith('|') && !line.includes('---|')).length - 1;
  
  // Build reasoning object from TF-IDF results
  const reasoning: MergeReasoning = {
    totalRowsA: Math.max(0, tableA),
    totalRowsB: Math.max(0, tableB),
    matchesFound: mergeResult.matchDetails.length,
    theta: theta,
    approach: 'TF-IDF cosine similarity',
    matchDetails: mergeResult.matchDetails,
    finalDecision: `Found ${mergeResult.matchDetails.length} matching rows using TF-IDF with theta=${theta}`
  };
  
  return {
    content: mergeResult.content,
    reasoning,
    cost: 0 // No API cost for local TF-IDF
  };
}

/**
 * Simple client-side union of multiple analysis results
 */
function mergeUnionResults(results: string[]): string {
  // Use the simpleUnionMerge from tfIdfMerge module which handles deduplication
  return simpleUnionMerge(results);
}

/**
 * Run multi-pass analysis with progress callbacks - now supports multiple providers
 */
export async function runMultiPassAnalysis(
  basePrompt: string,
  content: string,
  providerId: string,
  apiKey: string | null,
  selectedModel: string,
  numberOfPasses: number,
  strategy: 'intersection' | 'union',
  temperatureSettings: { singlePass: number; multiPass: number },
  mergeTheta: number,
  onProgress: (stage: string, passNumber?: number, totalPasses?: number) => void,
  onCostUpdate: (cost: number, tokens: number) => void
): Promise<{ content: string; totalCost: number; totalTokens: number; mergeReasoning?: MergeReasoning[]; rawResults: string[] }> {
  
  // Explicit state initialization to prevent cross-run contamination
  let totalCost = 0;
  let totalTokens = 0;
  const mergeReasoningArray: MergeReasoning[] = [];
  const runId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  
  console.log(`Starting multi-pass analysis run ${runId} with ${numberOfPasses} passes using ${strategy} strategy`);
  
  if (numberOfPasses === 1) {
    // Single pass - no special handling needed
    onProgress('Running analysis...');
    
    // Format messages for the API call
    const messages = [
      { role: 'user', content: `${basePrompt}\n\n${content}` }
    ];
    
    try {
      const result = await callLlmApi(
        providerId,
        apiKey,
        selectedModel,
        messages,
        temperatureSettings.singlePass
      );
      
      if (result.usage) {
        const cost = calculateCost(providerId, selectedModel, result.usage.inputTokens, result.usage.outputTokens);
        totalCost = cost;
        totalTokens = result.usage.totalTokens;
        onCostUpdate(cost, result.usage.totalTokens);
      }
      
      return {
        content: result.content,
        totalCost,
        totalTokens,
        mergeReasoning: [], // No merge reasoning for single pass
        rawResults: [result.content] // Single pass raw result
      };
    } catch (error: any) {
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }
  
  // Multi-pass analysis - explicit state initialization
  const analysisResults: string[] = [];
  
  for (let pass = 1; pass <= numberOfPasses; pass++) {
    onProgress('Running analysis pass', pass, numberOfPasses);
    
    // Generate randomized prompt for this pass
    const randomPrefix = generateRandomPromptPrefix(pass, numberOfPasses);
    const randomizedPrompt = randomPrefix + basePrompt;
    
    // Format messages for the API call
    const messages = [
      { role: 'user', content: `${randomizedPrompt}\n\n${content}` }
    ];
    
    try {
      // Run the analysis for this pass with configurable temperature
      const result = await callLlmApi(
        providerId,
        apiKey,
        selectedModel,
        messages,
        temperatureSettings.multiPass
      );
      
      // Track cost
      if (result.usage) {
        const cost = calculateCost(providerId, selectedModel, result.usage.inputTokens, result.usage.outputTokens);
        totalCost += cost;
        totalTokens += result.usage.totalTokens;
        onCostUpdate(cost, result.usage.totalTokens);
      }
      
      analysisResults.push(result.content);
      
    } catch (error: any) {
      console.warn(`Run ${runId}: Pass ${pass} failed: ${error.message}`);
      continue; // Continue with other passes
    }
    
    // No merging during passes - just store raw results
    // All merging will happen later with live theta adjustment
  }
  
  // Final result processing
  let finalContent: string;
  
  if (strategy === 'union') {
    // Union: combine all results client-side
    finalContent = mergeUnionResults(analysisResults);
  } else {
    // Intersection: progressive merge using TF-IDF (local, no API cost)
    if (analysisResults.length === 0) {
      finalContent = '| Sources of Conflict | Nature of Inconsistency | Recommended Fix |\n|---|---|---|';
    } else if (analysisResults.length === 1) {
      finalContent = analysisResults[0];
    } else {
      // Progressive merge A+B→A', A'+C→A'' etc.
      let mergedResult = analysisResults[0];
      
      for (let i = 1; i < analysisResults.length; i++) {
        onProgress('Merging results with TF-IDF', i, analysisResults.length - 1);
        
        // Clean table content before merging
        mergedResult = cleanTableContent(mergedResult);
        const passResult = cleanTableContent(analysisResults[i]);
        
        const mergeResult = mergeIntersectionResults(mergedResult, passResult, mergeTheta);
        mergedResult = mergeResult.content;
        
        if (mergeResult.reasoning) {
          mergeReasoningArray.push(mergeResult.reasoning);
        }
      }
      
      finalContent = mergedResult;
    }
  }
  
  console.log(`Run ${runId} complete. Total cost: $${totalCost.toFixed(4)}, Total tokens: ${totalTokens}`);
  
  return {
    content: finalContent,
    totalCost,
    totalTokens,
    mergeReasoning: mergeReasoningArray,
    rawResults: analysisResults // Return all raw results for live theta adjustment
  };
}