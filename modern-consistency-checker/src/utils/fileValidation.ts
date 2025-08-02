import type { FileType } from '../types';

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  json: 50 * 1024 * 1024,    // 50MB
  pdf: 100 * 1024 * 1024,    // 100MB  
  text: 25 * 1024 * 1024,    // 25MB
  markdown: 25 * 1024 * 1024, // 25MB
  docx: 50 * 1024 * 1024     // 50MB
} as const;

// MIME type validation
const ALLOWED_MIME_TYPES = {
  json: ['application/json', 'text/json'],
  pdf: ['application/pdf'],
  text: ['text/plain'],
  markdown: ['text/markdown', 'text/x-markdown', 'text/plain'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
} as const;

// File extension validation
const ALLOWED_EXTENSIONS = {
  json: ['.json'],
  pdf: ['.pdf'],
  text: ['.txt'],
  markdown: ['.md', '.markdown'],
  docx: ['.docx']
} as const;

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateFile(file: File, expectedType?: FileType): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic file checks
  if (!file) {
    errors.push('No file provided');
    return { isValid: false, errors, warnings };
  }

  if (!file.name || file.name.trim() === '') {
    errors.push('File must have a valid name');
  }

  if (file.size === 0) {
    errors.push('File cannot be empty');
  }

  // Detect file type
  const detectedType = detectFileTypeFromFile(file);
  if (!detectedType) {
    errors.push('Unsupported file type. Supported types: JSON, PDF, TXT, MD, DOCX');
  }

  // If expected type is provided, verify it matches
  if (expectedType && detectedType && expectedType !== detectedType) {
    errors.push(`Expected ${expectedType} file, but detected ${detectedType}`);
  }

  const fileType = expectedType || detectedType;

  if (fileType) {
    // Size validation
    const sizeLimit = FILE_SIZE_LIMITS[fileType];
    if (file.size > sizeLimit) {
      errors.push(`File size (${formatFileSize(file.size)}) exceeds limit (${formatFileSize(sizeLimit)}) for ${fileType} files`);
    }

    // MIME type validation
    if (file.type) {
      const allowedMimeTypes = ALLOWED_MIME_TYPES[fileType];
      const isValidMimeType = allowedMimeTypes.some(mimeType => mimeType === file.type);
      if (!isValidMimeType) {
        warnings.push(`MIME type '${file.type}' may not be compatible with ${fileType} files`);
      }
    }

    // Extension validation
    const allowedExtensions = ALLOWED_EXTENSIONS[fileType];
    const extension = file.name.toLowerCase().split('.').pop();
    const fileExtension = extension ? '.' + extension : '';
    const isValidExtension = allowedExtensions.some(ext => ext === fileExtension);
    if (!isValidExtension) {
      warnings.push(`File extension '${fileExtension}' may not be compatible with ${fileType} files`);
    }
  }

  // Security checks
  const securityIssues = performSecurityChecks(file);
  errors.push(...securityIssues);

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

function detectFileTypeFromFile(file: File): FileType | null {
  const extension = file.name.toLowerCase().split('.').pop();
  
  const typeMap: Record<string, FileType> = {
    'json': 'json',
    'pdf': 'pdf', 
    'txt': 'text',
    'md': 'markdown',
    'markdown': 'markdown',
    'docx': 'docx'
  };
  
  return typeMap[extension || ''] || null;
}

function performSecurityChecks(file: File): string[] {
  const issues: string[] = [];

  // Check for suspicious file names
  const suspiciousPatterns = [
    /\.\./,           // Path traversal
    /[<>:"|?*]/,      // Invalid characters
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i, // Reserved Windows names
    /\.exe$/i,        // Executable files
    /\.scr$/i,        // Screen saver files
    /\.bat$/i,        // Batch files
    /\.cmd$/i,        // Command files
    /\.vbs$/i,        // VBScript files
    /\.js$/i,         // JavaScript files (unless expected)
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(file.name)) {
      issues.push(`Potentially unsafe file name: ${file.name}`);
      break;
    }
  }

  // Check file name length
  if (file.name.length > 255) {
    issues.push('File name is too long (maximum 255 characters)');
  }

  // Check for null bytes in filename
  if (file.name.includes('\0')) {
    issues.push('File name contains null bytes');
  }

  return issues;
}

function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function validateMultipleFiles(files: File[]): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  if (files.length === 0) {
    allErrors.push('No files selected');
    return { isValid: false, errors: allErrors, warnings: allWarnings };
  }

  if (files.length > 20) {
    allErrors.push('Too many files selected (maximum 20 files)');
  }

  // Calculate total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const maxTotalSize = 200 * 1024 * 1024; // 200MB total
  
  if (totalSize > maxTotalSize) {
    allErrors.push(`Total file size (${formatFileSize(totalSize)}) exceeds limit (${formatFileSize(maxTotalSize)})`);
  }

  // Validate each file individually
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const result = validateFile(file);
    
    if (!result.isValid) {
      allErrors.push(`File ${i + 1} (${file.name}): ${result.errors.join(', ')}`);
    }
    
    if (result.warnings.length > 0) {
      allWarnings.push(`File ${i + 1} (${file.name}): ${result.warnings.join(', ')}`);
    }
  }

  // Check for duplicate filenames
  const fileNames = files.map(f => f.name.toLowerCase());
  const duplicates = fileNames.filter((name, index) => fileNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    allWarnings.push(`Duplicate file names detected: ${[...new Set(duplicates)].join(', ')}`);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}