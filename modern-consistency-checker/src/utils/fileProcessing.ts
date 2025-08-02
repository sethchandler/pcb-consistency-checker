import type { UploadedFile, FileType, ExtractedContent } from '../types';

// PDF.js is loaded globally via script tag (same as vanilla version)
// No import needed - it's available as window.pdfjsLib

// TypeScript declaration for global PDF.js
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export function detectFileType(file: File): FileType | null {
  const extension = file.name.toLowerCase().split('.').pop();
  const supportedTypes: Record<string, FileType> = {
    'json': 'json',
    'pdf': 'pdf',
    'txt': 'text',
    'md': 'markdown',
    'docx': 'docx'
  };
  
  return supportedTypes[extension || ''] || null;
}

export function createUploadedFile(file: File): UploadedFile | null {
  const fileType = detectFileType(file);
  
  if (!fileType) {
    return null;
  }

  return {
    name: file.name,
    type: fileType,
    size: file.size,
    file: file,
    processed: false,
    content: null,
    metadata: null
  };
}

export async function extractFileContent(fileData: UploadedFile): Promise<ExtractedContent> {
  const { file, type } = fileData;
  
  switch (type) {
    case 'json':
      return await extractJSONContent(file);
    case 'text':
    case 'markdown':
      return await extractTextContent(file);
    case 'pdf':
      return await extractPDFContent(file);
    case 'docx':
      return await extractDOCXContent(file);
    default:
      throw new Error(`Unsupported file type: ${type}`);
  }
}

async function extractJSONContent(file: File): Promise<ExtractedContent> {
  const text = await readFileAsText(file);
  const jsonData = JSON.parse(text);
  
  // Check if it's a PCB export format
  if (jsonData.caseFile && Array.isArray(jsonData.caseFile)) {
    const parsedData = parsePCBExport(jsonData);
    return {
      content: formatCaseFileForAnalysis(parsedData.caseFile),
      metadata: {
        documentType: 'pcb_export',
        components: parsedData.components,
        exportType: parsedData.exportType,
        version: parsedData.version
      },
      structured: true
    };
  } else {
    // Generic JSON - convert to text
    return {
      content: JSON.stringify(jsonData, null, 2),
      metadata: {
        documentType: 'json_document',
      },
      structured: false
    };
  }
}

async function extractTextContent(file: File): Promise<ExtractedContent> {
  const content = await readFileAsText(file);
  
  return {
    content: content,
    metadata: {
      documentType: 'text_document',
      length: content.length,
      lineCount: content.split('\n').length
    },
    structured: false
  };
}

async function extractPDFContent(file: File): Promise<ExtractedContent> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    const numPages = pdf.numPages;
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
    }
    
    return {
      content: fullText.trim() || '[No text content found in PDF]',
      metadata: {
        documentType: 'pdf_document',
        fileName: file.name,
        pages: numPages,
        extractedLength: fullText.length
      },
      structured: false
    };
    
  } catch (error: any) {
    console.error('PDF extraction error:', error);
    return {
      content: `[Error extracting PDF content from ${file.name}: ${error.message}]`,
      metadata: {
        documentType: 'pdf_document',
        fileName: file.name,
        error: error.message
      },
      structured: false
    };
  }
}

async function extractDOCXContent(file: File): Promise<ExtractedContent> {
  // Placeholder - would need docx parser
  return {
    content: `[DOCX Content from ${file.name}]\n\nNote: DOCX extraction not yet implemented. Please convert to text format.`,
    metadata: {
      documentType: 'docx_document',
      fileName: file.name,
    },
    structured: false
  };
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsText(file);
  });
}

// PCB Export handling
interface PCBComponent {
  id: string;
  type: string;
  title: string;
  content: string;
}

interface PCBExportData {
  caseFile: [string, PCBComponent][];
  exportType?: string;
  version?: string;
  exportedAt?: string;
}

function parsePCBExport(jsonData: PCBExportData) {
  if (!jsonData.caseFile || !Array.isArray(jsonData.caseFile)) {
    throw new Error('Invalid PCB export format: missing or invalid caseFile array');
  }

  const components = jsonData.caseFile.length;
  const componentsWithContent = jsonData.caseFile.filter(([, component]) => 
    component.content && component.content.trim()
  ).length;

  return {
    caseFile: jsonData.caseFile,
    components: components,
    componentsWithContent: componentsWithContent,
    exportType: jsonData.exportType || 'unknown',
    version: jsonData.version || '1.0',
    exportedAt: jsonData.exportedAt
  };
}

function formatCaseFileForAnalysis(caseFileArray: [string, PCBComponent][]) {
  let formattedContent = '';
  
  // Group by type
  const componentsByType: Record<string, PCBComponent[]> = {
    GOALS: [],
    CASE: [],
    WITNESS: [],
    DOCUMENT: []
  };
  
  caseFileArray.forEach(([, component]) => {
    if (componentsByType[component.type]) {
      componentsByType[component.type].push(component);
    }
  });
  
  // Format each type
  if (componentsByType.GOALS.length > 0) {
    formattedContent += '## LEARNING GOALS\\n\\n';
    componentsByType.GOALS.forEach(comp => {
      formattedContent += `### ${comp.title}\\n`;
      if (comp.content) formattedContent += `${comp.content}\\n`;
      formattedContent += '\\n---\\n\\n';
    });
  }
  
  if (componentsByType.CASE.length > 0) {
    formattedContent += '## CASE DESCRIPTION\\n\\n';
    componentsByType.CASE.forEach(comp => {
      formattedContent += `### ${comp.title}\\n`;
      if (comp.content) formattedContent += `${comp.content}\\n`;
      formattedContent += '\\n---\\n\\n';
    });
  }
  
  if (componentsByType.WITNESS.length > 0) {
    formattedContent += '## WITNESS TESTIMONIES\\n\\n';
    componentsByType.WITNESS.forEach(comp => {
      formattedContent += `### ${comp.title}\\n`;
      if (comp.content) formattedContent += `${comp.content}\\n`;
      formattedContent += '\\n---\\n\\n';
    });
  }
  
  if (componentsByType.DOCUMENT.length > 0) {
    formattedContent += '## DOCUMENTS\\n\\n';
    componentsByType.DOCUMENT.forEach(comp => {
      formattedContent += `### ${comp.title}\\n`;
      if (comp.content) formattedContent += `${comp.content}\\n`;
      formattedContent += '\\n---\\n\\n';
    });
  }
  
  return formattedContent;
}