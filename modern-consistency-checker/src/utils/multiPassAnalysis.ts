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
interface MergeReasoning {
  totalRowsA?: number;
  totalRowsB?: number;
  matchesFound?: number;
  cacheBreakerId?: string;
  approach?: string;
  abstractionProcess?: Array<{
    rowFromA: string;
    abstractedIntent: string;
    matchFoundInB: boolean;
    matchingRowB?: string;
    explanation: string;
  }>;
  finalDecision?: string;
}

async function mergeIntersectionResults(
  resultA: string, 
  resultB: string,
  apiKey: string,
  selectedModel: string,
  temperature: number
): Promise<{ content: string; reasoning?: MergeReasoning; usage?: TokenUsage; cost: number }> {
  // Detailed debug logging for content analysis
  console.log('\n=== MERGE OPERATION: HUMAN-READABLE ANALYSIS ===');
  console.log('📊 INPUT A (Full Content):');
  console.log(resultA);
  console.log('\n📊 INPUT B (Full Content):');
  console.log(resultB);
  console.log('\n🔍 ANALYSIS: What should a human expect to find in common?');
  console.log('Look at the tables above and mentally identify which inconsistencies');
  console.log('describe the SAME underlying problem (even with different wording).');
  console.log('=== END HUMAN ANALYSIS SECTION ===\n');
  
  // Generate cache-busting elements
  const cacheBreaker = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const analysisApproaches = [
    'systematic cross-referencing methodology',
    'forensic comparison analysis',
    'semantic overlap detection',
    'contextual similarity assessment',
    'pattern-based matching analysis'
  ];
  const selectedApproach = analysisApproaches[Math.floor(Math.random() * analysisApproaches.length)];
  
  const mergeInstructions = `Your task is to find matching rows between two tables.

First, here are the two tables you must process:

Table A:
${resultA}

Table B:
${resultB}

**Your Goal and Rules:**

1. **Primary Goal:** Create a new table containing only the rows from **Table A** that have a matching fix in **Table B**.
2. **Matching Rule:** A match occurs ONLY if the text in the "Recommended Fix" column describes the exact same action for the same document. Be conservative: if the fixes are similar but not identical, they do not match.
3. **Output Format:** Provide your output as a single JSON object. Analyze EVERY row from Table A in your reasoning. Do not use placeholder text; use the actual data from the tables.

Here is the JSON structure to use. Fill it with your analysis.

\`\`\`json
{
  "mergedTable": "| Sources of Conflict | Nature of Inconsistency | Recommended Fix |\\n|---|---|---|\\n[matching rows from Table A here, copied exactly]",
  "reasoning": {
    "totalRowsA": 0,
    "totalRowsB": 0,
    "matchesFound": 0,
    "cacheBreakerId": "${cacheBreaker}",
    "approach": "${selectedApproach}",
    "abstractionProcess": [
      {
        "rowFromA": "complete row text from Table A",
        "abstractedIntent": "what specific fix is prescribed",
        "matchFoundInB": false,
        "matchingRowB": "matching row text from Table B or null",
        "explanation": "why these fixes match or don't match"
      }
    ],
    "finalDecision": "Included X rows that had identical fixes in Table B"
  }
}
\`\`\`

Analysis ID: ${cacheBreaker}`;

  // Content is required by the API, even though tables are in the prompt
  const mergeContent = "Process the tables provided in the prompt above.";

  // LOG THE EXACT PROMPT BEING SENT TO CHATGPT
  console.log('\n🚨 === EXACT PROMPT SENT TO CHATGPT ===');
  console.log('PROMPT:');
  console.log('='.repeat(80));
  console.log(mergeInstructions);
  console.log('='.repeat(80));
  console.log('CONTENT:');
  console.log('='.repeat(80));
  console.log(mergeContent);
  console.log('='.repeat(80));
  console.log('END OF EXACT PROMPT');
  console.log('🚨 === END EXACT PROMPT ===\n');

  try {
    const result = await analyzeConsistency({
      prompt: mergeInstructions,
      content: mergeContent,
      apiKey,
      model: selectedModel,
      outputFormat: 'markdown',
      temperature: temperature
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

    const mergeOutput = result.rawResponse || '';
    
    // LOG THE EXACT RESPONSE FROM CHATGPT
    console.log('\n🔥 === EXACT RESPONSE FROM CHATGPT ===');
    console.log('RAW RESPONSE:');
    console.log('='.repeat(80));
    console.log(mergeOutput);
    console.log('='.repeat(80));
    console.log('END OF RAW RESPONSE');
    console.log('🔥 === END EXACT RESPONSE ===\n');
    
    // Parse JSON response and extract table + reasoning
    let finalTable = '';
    let reasoning = null;
    
    try {
      // Try to extract JSON from the response (might have markdown code blocks)
      const jsonMatch = mergeOutput.match(/```json\s*(\{[\s\S]*?\})\s*```/) || 
                       mergeOutput.match(/(\{[\s\S]*\})/);
      
      if (jsonMatch) {
        const jsonResponse = JSON.parse(jsonMatch[1]);
        finalTable = jsonResponse.mergedTable || '';
        reasoning = jsonResponse.reasoning || null;
        
        console.log('\n✅ JSON PARSING SUCCESS');
        console.log('📊 Extracted Table Length:', finalTable.length);
        console.log('🧠 Reasoning Captured:', !!reasoning);
        
        if (reasoning) {
          console.log('\n🔍 MERGE REASONING SUMMARY:');
          console.log(`Total rows in A: ${reasoning.totalRowsA || 'unknown'}`);
          console.log(`Total rows in B: ${reasoning.totalRowsB || 'unknown'}`);
          console.log(`Matches found: ${reasoning.matchesFound || 'unknown'}`);
          console.log(`Final decision: ${reasoning.finalDecision || 'none provided'}`);
          
          if (reasoning.abstractionProcess && reasoning.abstractionProcess.length > 0) {
            console.log('\n🎯 ABSTRACTION PROCESS:');
            reasoning.abstractionProcess.forEach((process: any, i: number) => {
              console.log(`Row ${i + 1}: ${process.abstractedIntent}`);
              console.log(`  Match found: ${process.matchFoundInB}`);
              console.log(`  Explanation: ${process.explanation}`);
            });
          }
        }
      } else {
        console.log('\n⚠️ JSON PARSING FAILED - Using raw response');
        finalTable = mergeOutput;
      }
      
    } catch (error: any) {
      console.log('\n❌ JSON PARSE ERROR:', error?.message || 'Unknown error');
      console.log('📝 Raw response:', mergeOutput);
      finalTable = mergeOutput; // Fallback to raw response
    }
    
    // Enhanced logging for human analysis
    console.log('\n🤖 LLM MERGE DECISION:');
    console.log('Raw Response Length:', mergeOutput.length);
    console.log('Final Table Length:', finalTable.length);
    console.log(`Approach used: ${selectedApproach}`);
    console.log(`Temperature: ${temperature}`);
    console.log(`Cache breaker: ${cacheBreaker}`);
    console.log('\n=== END MERGE ANALYSIS ===\n');

    return {
      content: finalTable,
      reasoning: reasoning, // Include reasoning in return for potential UI use
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
  temperatureSettings: { singlePass: number; multiPass: number; merge: number },
  onProgress: (stage: string, passNumber?: number, totalPasses?: number) => void,
  onCostUpdate: (cost: number, tokens: number) => void
): Promise<{ content: string; totalCost: number; totalTokens: number; mergeReasoning?: MergeReasoning[] }> {
  
  // Explicit state initialization to prevent cross-run contamination
  let totalCost = 0;
  let totalTokens = 0;
  const mergeReasoningArray: MergeReasoning[] = [];
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
      temperature: temperatureSettings.singlePass
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
      totalTokens,
      mergeReasoning: [] // No merge reasoning for single pass
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
    
    // Run the analysis for this pass with configurable temperature
    const result = await analyzeConsistency({
      prompt: randomizedPrompt,
      content,
      apiKey,
      model: selectedModel,
      outputFormat: 'markdown',
      temperature: temperatureSettings.multiPass
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
    
    // Human-readable logging of individual pass results
    console.log(`\n=== PASS ${pass} DETAILED RESULTS ===`);
    console.log('FULL RESULT:');
    console.log(passResult);
    console.log(`=== END PASS ${pass} ===\n`);
    
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
          selectedModel,
          temperatureSettings.merge
        );
        
        // Clean the merged content to ensure it's just the table
        mergedResult = cleanTableContent(merged.content);
        console.log(`Run ${runId}: Merge completed - result length: ${mergedResult.length}`);
        
        // Store reasoning for UI display
        if (merged.reasoning) {
          mergeReasoningArray.push(merged.reasoning);
        }
        
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
    totalTokens,
    mergeReasoning: mergeReasoningArray
  };
}