import type { ConsistencyCheckResult, StructuredDocument, Inconsistency } from '../types';

// Import the core function - we'll copy it to public folder and load it as a script
declare global {
  interface Window {
    consistencyCheckCore: {
      analyzeConsistency: (options: {
        prompt: string;
        content: string;
        apiKey: string;
        model?: string;
        outputFormat?: 'json' | 'markdown';
        temperature?: number;
        maxTokens?: number;
      }) => Promise<ConsistencyCheckResult>;
      ERROR_CODES: Record<string, string>;
      isValidAPIKey: (apiKey: string) => boolean;
      parseMarkdownToJSON: (markdown: string) => any;
    };
  }
}

export const ERROR_CODES = {
  MISSING_PARAMS: 'MISSING_PARAMS',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_API_KEY: 'INVALID_API_KEY',
  RATE_LIMIT: 'RATE_LIMIT',
  MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  NO_RESPONSE: 'NO_RESPONSE',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

export async function analyzeConsistency(options: {
  prompt: string;
  content: string;
  apiKey: string;
  model?: string;
  outputFormat?: 'json' | 'markdown';
}): Promise<ConsistencyCheckResult> {
  // Check if core function is loaded
  if (!window.consistencyCheckCore) {
    throw new Error('Consistency check core library not loaded');
  }

  return window.consistencyCheckCore.analyzeConsistency(options);
}

export function isValidAPIKey(apiKey: string): boolean {
  if (!window.consistencyCheckCore) {
    // Fallback implementation
    return !!(apiKey && apiKey.trim().startsWith('sk-') && apiKey.trim().length > 20);
  }
  return window.consistencyCheckCore.isValidAPIKey(apiKey);
}

export function parseConsistencyTable(markdownResponse: string): Inconsistency[] {
  const inconsistencies: Inconsistency[] = [];
  
  if (!markdownResponse || typeof markdownResponse !== 'string') {
    return inconsistencies;
  }
  
  // Find the table in the response
  const tableMatch = markdownResponse.match(/\|[\s\S]*?\|[\s\S]*?\|[\s\S]*?\|[\s\S]*?(?=\n\n|$)/);
  if (!tableMatch) {
    return inconsistencies;
  }
  
  const tableText = tableMatch[0];
  const rows = tableText.split('\n').filter(row => row.trim() && !row.includes('---|'));
  
  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    try {
      const cells = rows[i].split('|').filter(cell => cell.trim());
      
      if (cells.length >= 3) {
        const sources = cells[0].replace(/<br>/g, '\n').trim().split('\n')
          .map(s => s.replace(/^\d+\.\s*/, '').trim())
          .filter(s => s);
        
        const inconsistency: Inconsistency = {
          id: `issue-${Date.now()}-${i}`,
          sources: sources,
          nature: cells[1].trim(),
          suggestedFix: cells[2].trim(),
          severity: 'medium' // Default severity
        };
        
        if (inconsistency.nature && inconsistency.sources.length > 0) {
          inconsistencies.push(inconsistency);
        }
      }
    } catch (rowError) {
      console.error('Error parsing row', i, ':', rowError);
    }
  }
  
  return inconsistencies;
}

export function formatStructuredDocuments(documents: StructuredDocument[]): string {
  let formattedContent = '# CASE FILE ANALYSIS\n\n';
  
  // Group documents by type
  const documentsByType: Record<string, StructuredDocument[]> = {};
  documents.forEach(doc => {
    const type = doc.enhanced_metadata.document_type || 'other';
    if (!documentsByType[type]) {
      documentsByType[type] = [];
    }
    documentsByType[type].push(doc);
  });
  
  // Format each type
  Object.entries(documentsByType).forEach(([type, docs]) => {
    const typeTitle = type.replace('_', ' ').toUpperCase();
    formattedContent += `## ${typeTitle} DOCUMENTS\n\n`;
    
    docs.forEach(doc => {
      formattedContent += `### ${doc.enhanced_metadata.title || doc.name}\n`;
      formattedContent += `**File**: ${doc.name}\n`;
      formattedContent += `**Type**: ${doc.enhanced_metadata.document_type}\n`;
      
      if (doc.enhanced_metadata.parties && doc.enhanced_metadata.parties.length > 0) {
        formattedContent += `**Parties**: ${doc.enhanced_metadata.parties.join(', ')}\n`;
      }
      
      if (doc.enhanced_metadata.dates && doc.enhanced_metadata.dates.length > 0) {
        formattedContent += `**Dates**: ${doc.enhanced_metadata.dates.join(', ')}\n`;
      }
      
      if (doc.enhanced_metadata.locations && doc.enhanced_metadata.locations.length > 0) {
        formattedContent += `**Locations**: ${doc.enhanced_metadata.locations.join(', ')}\n`;
      }
      
      if (doc.enhanced_metadata.financial_amounts && doc.enhanced_metadata.financial_amounts.length > 0) {
        formattedContent += `**Financial Amounts**: ${doc.enhanced_metadata.financial_amounts.join(', ')}\n`;
      }
      
      if (doc.enhanced_metadata.key_facts && doc.enhanced_metadata.key_facts.length > 0) {
        formattedContent += `**Key Facts**:\n`;
        doc.enhanced_metadata.key_facts.forEach(fact => {
          formattedContent += `- ${fact}\n`;
        });
      }
      
      formattedContent += `\n**Content**:\n${doc.content}\n\n---\n\n`;
    });
  });
  
  return formattedContent;
}