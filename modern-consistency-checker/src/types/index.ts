// Core types for the consistency checker

export interface UploadedFile {
  name: string;
  type: FileType;
  size: number;
  file: File;
  processed: boolean;
  content: string | null;
  metadata: DocumentMetadata | null;
}

export type FileType = 'json' | 'pdf' | 'text' | 'markdown' | 'docx';

export interface DocumentMetadata {
  documentType: string;
  components?: number;
  exportType?: string;
  version?: string;
  fileName?: string;
  pages?: number;
  length?: number;
  lineCount?: number;
  extractedLength?: number;
  error?: string;
}

export interface ExtractedContent {
  content: string;
  metadata: DocumentMetadata;
  structured: boolean;
}

export interface EnhancedMetadata {
  document_type: 'witness_statement' | 'contract' | 'evidence' | 'case_summary' | 
                 'police_report' | 'financial_record' | 'correspondence' | 'other';
  title: string;
  parties: string[];
  dates: string[];
  locations: string[];
  key_facts: string[];
  financial_amounts: string[];
  references: string[];
  confidence: number;
}

export interface StructuredDocument extends UploadedFile {
  enhanced_metadata: EnhancedMetadata;
}

export interface Inconsistency {
  id: string;
  sources: string[];
  nature: string;
  suggestedFix: string;
  severity?: 'high' | 'medium' | 'low';
}

export interface MergeReasoning {
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

export interface AnalysisResult {
  content: string; // The markdown/text analysis result
  extractedContents: ExtractedContent[];
  mergeReasoning?: MergeReasoning[]; // Array of reasoning for each merge operation
  metadata: {
    model: string;
    timestamp: string;
    fileCount: number;
    totalCharacters: number;
    promptLength: number;
    cost?: number;
    tokensUsed?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
}

// Analysis emphasis type
export type AnalysisEmphasis = 'avoid-false-negatives' | 'neutral' | 'avoid-false-positives';

// Last analysis settings type for storing raw results context
export interface LastAnalysisSettings {
  numberOfPasses: number;
  passStrategy: 'intersection' | 'union';
  temperatureSettings: {
    singlePass: number;
    multiPass: number;
  };
}

// Token usage interface
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Store state interface
export interface ConsistencyStore {
  // State
  uploadedFiles: UploadedFile[];
  currentPrompt: string;
  analysisResults: AnalysisResult | null;
  isProcessing: boolean;
  error: string | null;
  apiKey: string;
  selectedModel: string;
  analysisEmphasis: AnalysisEmphasis;
  sessionCost: number;
  totalTokensUsed: number;
  numberOfPasses: 1 | 2 | 3;
  passStrategy: 'intersection' | 'union';
  currentProgress: string | null;
  temperatureSettings: {
    singlePass: number;
    multiPass: number;
  };
  mergeTheta: number;
  rawPassResults: string[];
  lastAnalysisSettings: LastAnalysisSettings | null;
  
  // Actions
  setUploadedFiles: (files: UploadedFile[]) => void;
  addUploadedFiles: (files: UploadedFile[]) => void;
  setCurrentPrompt: (prompt: string) => void;
  setAnalysisResults: (results: AnalysisResult | null) => void;
  setIsProcessing: (processing: boolean) => void;
  setError: (error: string | null) => void;
  setApiKey: (key: string) => void;
  setSelectedModel: (model: string) => void;
  setAnalysisEmphasis: (emphasis: AnalysisEmphasis) => void;
  setNumberOfPasses: (passes: 1 | 2 | 3) => void;
  setCurrentProgress: (progress: string | null) => void;
  setTemperatureSettings: (settings: { singlePass: number; multiPass: number }) => void;
  setMergeTheta: (theta: number) => void;
  setRawPassResults: (results: string[]) => void;
  setLastAnalysisSettings: (settings: LastAnalysisSettings) => void;
  clearRawPassResults: () => void;
  addToCost: (cost: number, tokens: number) => void;
  resetSessionCost: () => void;
  reset: () => void;
}

// API Response types
export interface ConsistencyCheckResult {
  success: boolean;
  format: 'json' | 'markdown';
  model: string;
  timestamp: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  data?: any;
  rawResponse?: string;
  errorCode?: string;
  error?: string;
  errorDetails?: any;
}