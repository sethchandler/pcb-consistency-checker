import { useConsistencyStore } from '../store/useConsistencyStore';
import { extractFileContent } from './fileProcessing';
import { addEmphasisToPrompt } from './promptModifier';
import { runMultiPassAnalysis } from './multiPassAnalysis';
import type { ExtractedContent, AnalysisResult, TokenUsage } from '../types';

export const runConsistencyAnalysis = async (): Promise<void> => {
  const { 
    uploadedFiles, 
    apiKey, 
    selectedModel, 
    currentPrompt,
    analysisEmphasis,
    numberOfPasses,
    passStrategy,
    temperatureSettings,
    mergeTheta,
    setAnalysisResults,
    setError,
    setCurrentProgress,
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
    
    // Step 4: Run multi-pass or single-pass analysis
    const result = await runMultiPassAnalysis(
      modifiedPrompt,
      combinedContent,
      apiKey,
      selectedModel,
      numberOfPasses,
      passStrategy,
      temperatureSettings,
      mergeTheta,
      (stage: string, passNumber?: number, totalPasses?: number) => {
        // Progress updates - display in UI instead of console
        const progressMessage = passNumber && totalPasses ? `${stage} ${passNumber}/${totalPasses}` : stage;
        setCurrentProgress(progressMessage);
      },
      (cost: number, tokens: number) => {
        // Cost updates - add to session tracking immediately
        addToCost(cost, tokens);
      }
    );

    // Step 5: Prepare token usage data for metadata
    let tokensUsed: TokenUsage | undefined;
    if (result.totalTokens > 0) {
      tokensUsed = {
        promptTokens: 0, // We don't track individual prompt/completion splits in multi-pass
        completionTokens: 0,
        totalTokens: result.totalTokens
      };
    }

    // Step 6: Create final result
    const analysisResult: AnalysisResult = {
      content: result.content,
      extractedContents,
      mergeReasoning: result.mergeReasoning, // Include merge reasoning for UI
      metadata: {
        model: selectedModel,
        timestamp: new Date().toISOString(),
        fileCount: uploadedFiles.length,
        totalCharacters: combinedContent.length,
        promptLength: currentPrompt.length,
        cost: result.totalCost,
        tokensUsed
      }
    };

    setAnalysisResults(analysisResult);
    setCurrentProgress(null); // Clear progress when done
    
  } catch (error: any) {
    console.error('Analysis failed:', error);
    setError(error.message || 'Analysis failed');
    setCurrentProgress(null); // Clear progress on error
    throw error;
  }
};