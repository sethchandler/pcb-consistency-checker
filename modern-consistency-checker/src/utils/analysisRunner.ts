import { useConsistencyStore } from '../store/useConsistencyStore';
import { extractFileContent } from './fileProcessing';
import { analyzeConsistency } from './consistencyCheckWrapper';
import { addEmphasisToPrompt } from './promptModifier';
import { calculateCost } from './modelPricing';
import type { ExtractedContent, AnalysisResult, TokenUsage } from '../types';

export const runConsistencyAnalysis = async (): Promise<void> => {
  const { 
    uploadedFiles, 
    apiKey, 
    selectedModel, 
    currentPrompt,
    analysisEmphasis,
    setAnalysisResults,
    setError,
    addToCost
  } = useConsistencyStore.getState();

  if (uploadedFiles.length === 0) {
    throw new Error('No files uploaded');
  }

  if (!apiKey) {
    throw new Error('API key required');
  }

  try {
    // Step 1: Extract content from all files
    const extractedContents: ExtractedContent[] = [];
    
    for (const file of uploadedFiles) {
      try {
        const extracted = await extractFileContent(file);
        extractedContents.push(extracted);
      } catch (error) {
        console.error(`Error extracting ${file.name}:`, error);
        extractedContents.push({
          content: `Error extracting content from ${file.name}: ${error}`,
          metadata: { documentType: 'error', fileName: file.name },
          structured: false
        });
      }
    }

    // Step 2: Combine all content for analysis
    const combinedContent = extractedContents
      .map((extracted, index) => {
        const fileName = uploadedFiles[index]?.name || `Document ${index + 1}`;
        return `=== Document: ${fileName} ===\n${extracted.content}\n\n`;
      })
      .join('');

    // Step 3: Modify prompt based on emphasis setting  
    const modifiedPrompt = addEmphasisToPrompt(currentPrompt, analysisEmphasis);
    
    // Step 4: Run consistency analysis
    const analysisResult = await analyzeConsistency({
      prompt: modifiedPrompt,
      content: combinedContent,
      apiKey: apiKey,
      model: selectedModel,
      outputFormat: 'markdown'
    });

    if (!analysisResult.success) {
      throw new Error(analysisResult.error || 'Analysis failed');
    }

    // Step 5: Calculate cost and track usage
    let cost = 0;
    let totalTokens = 0;
    let tokensUsed: TokenUsage | undefined;
    
    if (analysisResult.usage) {
      tokensUsed = {
        promptTokens: analysisResult.usage.promptTokens,
        completionTokens: analysisResult.usage.completionTokens,
        totalTokens: analysisResult.usage.totalTokens
      };
      
      cost = calculateCost(selectedModel, tokensUsed);
      totalTokens = tokensUsed.totalTokens;
      
      // Add to session cost tracking
      addToCost(cost, totalTokens);
    }

    // Step 6: Create final result
    const result: AnalysisResult = {
      content: analysisResult.rawResponse || '',
      extractedContents,
      metadata: {
        model: selectedModel,
        timestamp: new Date().toISOString(),
        fileCount: uploadedFiles.length,
        totalCharacters: combinedContent.length,
        promptLength: currentPrompt.length,
        cost,
        tokensUsed
      }
    };

    setAnalysisResults(result);
    
  } catch (error: any) {
    console.error('Analysis failed:', error);
    setError(error.message || 'Analysis failed');
    throw error;
  }
};