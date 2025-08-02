import type { AnalysisEmphasis } from '../types';

/**
 * Modifies the base prompt based on the selected analysis emphasis
 */
export function addEmphasisToPrompt(basePrompt: string, emphasis: AnalysisEmphasis): string {
  const emphasisInstructions = {
    'avoid-false-negatives': `

**EMPHASIS: COMPREHENSIVE DETECTION (Avoid Missing Issues)**

You are specifically instructed to err on the side of flagging potential inconsistencies. When you encounter:
- Ambiguous situations that could be interpreted as inconsistent
- Minor discrepancies that might be explained by different perspectives  
- Unclear or imprecise information that makes verification difficult
- Situations where the evidence is incomplete but suggestive of conflict

**FLAG THESE AS INCONSISTENCIES** and explain why they warrant investigation, even if there might be innocent explanations. It's better to identify a potential issue for human review than to miss a real inconsistency.

In your analysis, use qualifying language like "potential inconsistency" or "requires clarification" for borderline cases, but still include them in your findings table.`,

    'neutral': `

**EMPHASIS: BALANCED APPROACH**

Apply standard consistency checking practices. Flag clear inconsistencies while using reasonable judgment for ambiguous cases. Consider context and allow for minor variations that don't affect the core facts of the case.`,

    'avoid-false-positives': `

**EMPHASIS: HIGH CONFIDENCE DETECTION (Avoid False Alarms)**

You are specifically instructed to be highly selective and only flag clear, unambiguous inconsistencies. When you encounter:
- Situations that could be explained by different perspectives or interpretations
- Minor discrepancies that might result from rounding, approximation, or memory limitations
- Variations in terminology that refer to the same concept
- Missing details that don't directly contradict stated facts

**DO NOT FLAG THESE** unless they represent clear, objective contradictions. Only include inconsistencies in your findings table when you are confident they represent genuine conflicts that cannot reasonably be explained by normal variation in human recollection, different vantage points, or minor imprecision.

Require a high standard of evidence before declaring something inconsistent. When in doubt, do not flag it.`
  };

  return basePrompt + emphasisInstructions[emphasis];
}

/**
 * Gets a human-readable description of what the emphasis setting does
 */
export function getEmphasisDescription(emphasis: AnalysisEmphasis): string {
  const descriptions = {
    'avoid-false-negatives': 'The AI will be more sensitive and flag potential issues even when there might be innocent explanations. This helps ensure no real inconsistencies are missed, but may include some items that turn out to be non-issues upon closer review.',
    'neutral': 'The AI will use balanced judgment, flagging clear inconsistencies while considering context and allowing for reasonable variations.',
    'avoid-false-positives': 'The AI will only flag very clear, unambiguous inconsistencies. This minimizes false alarms but might miss some subtle or complex inconsistencies that require human judgment.'
  };
  
  return descriptions[emphasis];
}