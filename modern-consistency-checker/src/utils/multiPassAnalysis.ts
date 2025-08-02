import { analyzeConsistency } from './consistencyCheckWrapper';
import { calculateCost } from './modelPricing';
import type { TokenUsage } from '../types';

/**
 * Clean content to extract just the markdown table
 */
function cleanTableContent(content: string): string {
  // Extract just the table from the content
  const tableMatch = content.match(/\|[\s\S]*?\|[\s\S]*?\|[\s\S]*?\|[\s\S]*?(?=\n\n|$)/);
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
 * Merge two analysis results using intersection strategy
 */
async function mergeIntersectionResults(
  resultA: string, 
  resultB: string,
  apiKey: string,
  selectedModel: string
): Promise<{ content: string; usage?: TokenUsage; cost: number }> {
  // Debug logging
  console.log('Merge inputs - Result A length:', resultA?.length, 'Result B length:', resultB?.length);
  
  const mergeInstructions = `YOU ARE A TABLE INTERSECTION OPERATOR

Your task: Given two inconsistency tables, return ONLY rows that represent the SAME inconsistency (by meaning, not exact text).

CRITICAL CONCEPT - Semantic Similarity:
- You must perform r1 × r2 comparisons (where r1 = rows in table 1, r2 = rows in table 2)
- Compare the MEANING of each inconsistency, not the exact wording
- Two rows describe the SAME inconsistency if they identify the same factual conflict
- Different wording of the same problem = SAME inconsistency
- Different problems entirely = DIFFERENT inconsistencies

INPUT FORMAT:
Both tables have exactly 3 columns:
| Sources of Conflict | Nature of Inconsistency | Recommended Fix |

OUTPUT FORMAT:
You MUST return a table with the EXACT SAME 3 columns:
| Sources of Conflict | Nature of Inconsistency | Recommended Fix |

INTERSECTION RULES:
1. For each row in Table A, check if it semantically matches ANY row in Table B
2. If a match exists, include it in output (use the clearer/more detailed version)
3. If no match exists, exclude it
4. NEVER create new columns or change the table structure

EXAMPLE OF SEMANTIC MATCHING:

Table A row:
| 1. Police Report<br>2. Witness Statement | Date discrepancy: Report says Jan 15, witness says Jan 20 | **Police Report**: Change to Jan 20 |

Table B row:
| 1. Official Report<br>2. J. Smith Testimony | Event date conflict: January 20 per testimony vs January 15 in report | **Official Report**: Update date to match testimony |

THESE ARE THE SAME (different words, same meaning) - Include ONE in output

EXAMPLE OF NON-MATCHING:

Table A row:
| 1. Contract<br>2. Invoice | Payment terms: Net 30 vs Net 45 | **Invoice**: Correct to Net 30 |

Table B row:
| 1. Contract<br>2. Email | Duration: 6 months vs 12 months claimed | **Email**: Correct to 6 months |

THESE ARE DIFFERENT (both involve contract but different issues) - Include NEITHER

YOU ARE FORBIDDEN FROM:
- Creating comparison columns like "Document 1" or "Analysis A"
- Adding row numbers or item numbers
- Creating any new table structure
- Adding explanatory text above or below the table

OUTPUT:
Return ONLY the intersection table with the standard 3 columns.
If no common inconsistencies exist, return:
| Sources of Conflict | Nature of Inconsistency | Recommended Fix |
|---|---|---|`;

  const mergeContent = `ANALYSIS A:
${resultA}

ANALYSIS B:
${resultB}`;

  try {
    const result = await analyzeConsistency({
      prompt: mergeInstructions,
      content: mergeContent,
      apiKey,
      model: selectedModel,
      outputFormat: 'markdown',
      temperature: 0.7  // Moderate temperature for merge - want some creativity but still reliable
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
  
  // Explicit state initialization to prevent cross-run contamination
  let totalCost = 0;
  let totalTokens = 0;
  const runId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  
  console.log(`Starting multi-pass analysis run ${runId} with ${numberOfPasses} passes using ${strategy} strategy`);
  
  if (numberOfPasses === 1) {
    // Single pass - no special handling needed
    onProgress('Running analysis...');
    
    const result = await analyzeConsistency({
      prompt: basePrompt,
      content,
      apiKey,
      model: selectedModel,
      outputFormat: 'markdown',
      temperature: 0.3  // Lower temperature for single-pass - want consistent, reliable results
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
  
  // Multi-pass analysis - explicit state initialization
  const analysisResults: string[] = [];
  let mergedResult: string = '';  // Explicitly typed and initialized
  
  for (let pass = 1; pass <= numberOfPasses; pass++) {
    console.log(`Run ${runId}: Starting pass ${pass}/${numberOfPasses}`);
    onProgress('Running analysis pass', pass, numberOfPasses);
    
    // Generate randomized prompt for this pass
    const randomPrefix = generateRandomPromptPrefix(pass, numberOfPasses);
    const randomizedPrompt = randomPrefix + basePrompt;
    
    console.log(`Run ${runId}: Pass ${pass} prompt prefix length: ${randomPrefix.length}`);
    
    // Run the analysis for this pass with higher temperature for variability
    const result = await analyzeConsistency({
      prompt: randomizedPrompt,
      content,
      apiKey,
      model: selectedModel,
      outputFormat: 'markdown',
      temperature: 0.8  // Higher temperature for multi-pass to ensure varied outputs
    });
    
    if (!result.success) {
      console.warn(`Run ${runId}: Pass ${pass} failed: ${result.error}`);
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
    
    console.log(`Run ${runId}: Pass ${pass} completed - result length: ${passResult.length}`);
    
    // For intersection strategy, merge progressively
    if (strategy === 'intersection' && analysisResults.length >= 2) {
      onProgress('Finding common inconsistencies', pass, numberOfPasses);
      
      // Determine what to merge with current result
      let previousResult: string;
      if (pass === 2) {
        // First merge: use the first analysis result
        previousResult = analysisResults[0];
        console.log(`Run ${runId}: First merge - using pass 1 result (length: ${previousResult.length})`);
      } else {
        // Subsequent merges: use the previously merged result
        previousResult = mergedResult;
        console.log(`Run ${runId}: Subsequent merge - using previous merged result (length: ${previousResult.length})`);
      }
      
      const currentResult = analysisResults[analysisResults.length - 1];
      
      console.log(`Run ${runId}: About to merge - Previous length: ${previousResult?.length}, Current length: ${currentResult?.length}`);
      
      try {
        const merged = await mergeIntersectionResults(
          previousResult,
          currentResult,
          apiKey,
          selectedModel
        );
        
        // Clean the merged content to ensure it's just the table
        mergedResult = cleanTableContent(merged.content);
        console.log(`Run ${runId}: Merge completed - result length: ${mergedResult.length}`);
        
        totalCost += merged.cost;
        if (merged.usage) {
          totalTokens += merged.usage.totalTokens;
          onCostUpdate(merged.cost, merged.usage.totalTokens);
        }
      } catch (error) {
        console.error(`Run ${runId}: Failed to merge pass ${pass}:`, error);
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
    console.log(`Run ${runId}: Union strategy - final content length: ${finalContent.length}`);
  } else {
    // Intersection: use the progressively merged result
    finalContent = mergedResult || (analysisResults.length > 0 ? analysisResults[0] : '');
    // Ensure the final content is clean
    finalContent = cleanTableContent(finalContent);
    console.log(`Run ${runId}: Intersection strategy - final content length: ${finalContent.length} (from mergedResult: ${mergedResult.length})`);
  }
  
  console.log(`Run ${runId}: Completed - Total cost: $${totalCost.toFixed(5)}, Total tokens: ${totalTokens}`);
  
  return {
    content: finalContent,
    totalCost,
    totalTokens
  };
}