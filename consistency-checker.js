// Client-side PCB Consistency Checker
// Pure JavaScript - no server required!

// Default consistency prompt (from our CLI version)
const DEFAULT_PROMPT = `You are an expert legal analyst AI. Your task is to meticulously review the entirety of the provided legal case file, which includes the case summary, witness statements, and all associated documents. Your goal is to identify factual inconsistencies, contradictions, and discrepancies among these sources.

**IMPORTANT: Focus ONLY on objective factual conflicts. Do NOT flag different perspectives, opinions, or legitimate stakeholder disagreements as inconsistencies.**

## What IS an Inconsistency (Flag These):

1. **Date and Time Conflicts**: Specific dates or times reported differently across sources (e.g., "Police report says accident at 3:00 PM, witness testimony claims 3:30 PM").

2. **Numerical Discrepancies**: Conflicting specific numbers (e.g., "Witness states dinner cost $50, receipt shows $55").

3. **Geographical Conflicts**: Different specific locations for the same event (e.g., "Contract signed in Dallas, TX vs. witness says Dallas, GA").

4. **Name/Identity Errors**: Misspellings or wrong names for the same person/entity (e.g., "Police report names witness 'John Smith', testimony refers to 'Jon Smith'").

5. **Physical Description Conflicts**: Contradictory descriptions of the same object/person (e.g., "Witness A describes blue sedan, Witness B describes same car as green coupe").

6. **Timeline Contradictions**: Impossible sequences of events (e.g., "Person claims to leave Boston at 2 PM and arrive in LA at 3 PM same day").

7. **Logical Impossibilities**: Physically impossible claims (e.g., "Witness claims to be in two different cities simultaneously").

8. **Documentary vs. Testimony Conflicts**: Documents contradicting witness recollections of the same specific facts (e.g., "Contract states 30-day terms, witness recalls 60-day terms").

## What is NOT an Inconsistency (Do NOT Flag These):

- **Different Perspectives**: CEO prioritizes profits while patient advocate prioritizes affordability
- **Different Opinions**: Witnesses having different views on what should be done
- **Different Priorities**: Stakeholders emphasizing different aspects of the same situation  
- **Different Strategies**: People proposing different approaches to solve problems
- **Natural Conflicts of Interest**: Expected disagreements between parties with different roles
- **Subjective Assessments**: Different judgments about the same objective facts
- **Incomplete Information**: One source having more details than another

## Output Requirements:

In the "Nature of Inconsistency" column, be extremely specific. Instead of general topics like "Pricing Issues" or "Timeline Problems," provide explicit descriptions such as:
- "Date conflict: Receipt dated June 22, testimony claims June 24"
- "Amount discrepancy: Invoice shows $1,500, witness recalls $1,200"  
- "Location error: Document says 'Houston, TX', witness testimony says 'Austin, TX'"
- "Name inconsistency: Police report spells 'Katherine Jones', contract shows 'Catherine Jones'"

Present your findings in a single Markdown table with these three columns:

- **Sources of Conflict**: List the specific sources containing conflicting information
- **Nature of Inconsistency**: Provide an explicit description of exactly what conflicts (not just the topic)
- **Recommended Fix**: Specify exactly which document/source should be modified, what specific text to change, what to change it to, and why that source was chosen for modification. Format as: "**[Document Name]**: Change '[current text]' to '[corrected text]' to match [authoritative source] because [reason]."

**Examples of Good Analysis:**

| Sources of Conflict | Nature of Inconsistency | Recommended Fix |
|---|---|---|
| 1. Hotel Receipt #4721<br>2. Jane Doe's Testimony | Check-in date conflict: Receipt dated June 22, 2024, testimony states June 24, 2024 | **Jane Doe's Testimony**: Change 'June 24, 2024' to 'June 22, 2024' to match Hotel Receipt #4721 because official hotel documentation is more reliable than witness recollection. |
| 1. Police Report<br>2. Contract | Name inconsistency: Police report spells 'Katherine Jones', contract shows 'Catherine Jones' | **Police Report**: Change 'Katherine Jones' to 'Catherine Jones' to match the Contract because the contract represents the person's legal signature and preferred spelling. |
| 1. Forensic Report<br>2. Case Description | Missing information: Forensic Report shows '[Defendant's Name]' while Case Description identifies defendant as 'Mark Davies' | **Forensic Report**: Replace '[Defendant's Name]' with 'Mark Davies' to match Case Description because placeholder text should be filled with actual case details. |

**Example of What NOT to Flag:**

❌ "CEO emphasizes profitability while Patient Advocate emphasizes accessibility" - This is a natural stakeholder difference, not a factual inconsistency.

Now, please analyze the following legal case file and generate a comprehensive table of all FACTUAL inconsistencies you find. Remember: only flag objective contradictions about specific facts, not different viewpoints or priorities.

[CASE FILE CONTENT FOLLOWS]
`;

// Global state
let uploadedFiles = []; // Changed from single caseFileData to array of files
let currentPrompt = DEFAULT_PROMPT;
let analysisResults = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    loadDefaultPrompt();
    setupFileUploads();
    setupDragAndDrop();
    setupAPIKeyMonitor();
    updateCheckButton(); // Initialize button states
});

// Load default prompt into textarea
function loadDefaultPrompt() {
    document.getElementById('promptTextarea').value = DEFAULT_PROMPT;
}

// Setup file upload handlers
function setupFileUploads() {
    // Case file upload - now handles multiple files
    document.getElementById('caseFileInput').addEventListener('change', function(e) {
        handleMultipleFileUpload(e.target.files);
    });

    // Prompt file upload
    document.getElementById('promptFileInput').addEventListener('change', function(e) {
        handlePromptFileUpload(e.target.files[0]);
    });

    // Monitor prompt textarea changes
    document.getElementById('promptTextarea').addEventListener('input', function(e) {
        currentPrompt = e.target.value;
    });
}

// Setup drag and drop
function setupDragAndDrop() {
    const caseFileUpload = document.getElementById('caseFileUpload');
    const promptFileUpload = document.getElementById('promptFileUpload');

    // Case file drag and drop
    caseFileUpload.addEventListener('dragover', function(e) {
        e.preventDefault();
        caseFileUpload.classList.add('dragover');
    });

    caseFileUpload.addEventListener('dragleave', function(e) {
        e.preventDefault();
        caseFileUpload.classList.remove('dragover');
    });

    caseFileUpload.addEventListener('drop', function(e) {
        e.preventDefault();
        caseFileUpload.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleMultipleFileUpload(files);
        }
    });

    // Prompt file drag and drop
    promptFileUpload.addEventListener('dragover', function(e) {
        e.preventDefault();
        promptFileUpload.classList.add('dragover');
    });

    promptFileUpload.addEventListener('dragleave', function(e) {
        e.preventDefault();
        promptFileUpload.classList.remove('dragover');
    });

    promptFileUpload.addEventListener('drop', function(e) {
        e.preventDefault();
        promptFileUpload.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handlePromptFileUpload(files[0]);
        }
    });
}

// Handle multiple file upload
function handleMultipleFileUpload(files) {
    if (!files || files.length === 0) return;

    uploadedFiles = []; // Clear existing files
    let processedCount = 0;
    let fileInfoHTML = '';

    Array.from(files).forEach((file, index) => {
        const fileType = detectFileType(file);
        
        if (!fileType) {
            showError(`Unsupported file type: ${file.name}`);
            return;
        }

        const fileData = {
            name: file.name,
            type: fileType,
            size: file.size,
            file: file,
            processed: false,
            content: null,
            metadata: null
        };

        uploadedFiles.push(fileData);
        fileInfoHTML += `<div>📄 <strong>${file.name}</strong> (${fileType.toUpperCase()})</div>`;
    });

    document.getElementById('caseFileInfo').innerHTML = 
        `✅ ${uploadedFiles.length} files uploaded:<br>${fileInfoHTML}`;
    
    updateCheckButton();
}

// Detect file type based on extension
function detectFileType(file) {
    const extension = file.name.toLowerCase().split('.').pop();
    const supportedTypes = {
        'json': 'json',
        'pdf': 'pdf', 
        'txt': 'text',
        'md': 'markdown',
        'docx': 'docx'
    };
    
    return supportedTypes[extension] || null;
}

// Content extraction pipeline for different file types
async function extractFileContent(fileData) {
    const { file, type } = fileData;
    
    try {
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
    } catch (error) {
        console.error(`Error extracting content from ${file.name}:`, error);
        throw error;
    }
}

// Extract content from JSON files (backward compatibility with PCB exports)
async function extractJSONContent(file) {
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
                keys: Object.keys(jsonData).slice(0, 10) // First 10 keys for reference
            },
            structured: false
        };
    }
}

// Extract content from text/markdown files
async function extractTextContent(file) {
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

// Extract content from PDF files using PDF.js
async function extractPDFContent(file) {
    try {
        // Convert file to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        
        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let fullText = '';
        const numPages = pdf.numPages;
        
        // Extract text from each page
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Combine text items from the page
            const pageText = textContent.items
                .map(item => item.str)
                .join(' ');
            
            fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
        }
        
        return {
            content: fullText.trim() || '[No text content found in PDF]',
            metadata: {
                documentType: 'pdf_document',
                fileName: file.name,
                size: file.size,
                pages: numPages,
                extractedLength: fullText.length
            },
            structured: false
        };
        
    } catch (error) {
        console.error('PDF extraction error:', error);
        return {
            content: `[Error extracting PDF content from ${file.name}: ${error.message}]`,
            metadata: {
                documentType: 'pdf_document',
                fileName: file.name,
                size: file.size,
                error: error.message
            },
            structured: false
        };
    }
}

// Extract content from DOCX files (placeholder - would need docx parser)
async function extractDOCXContent(file) {
    // For now, return placeholder - in full implementation would use docx parser
    return {
        content: `[DOCX Content from ${file.name}]\n\nNote: DOCX extraction not yet implemented. Please convert to text format.`,
        metadata: {
            documentType: 'docx_document',
            fileName: file.name,
            size: file.size
        },
        structured: false
    };
}

// Helper function to read file as text
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error(`Failed to read file: ${file.name}`));
        reader.readAsText(file);
    });
}

// Handle prompt file upload
function handlePromptFileUpload(file) {
    if (!file) return;

    const validExtensions = ['.txt', '.md'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
        showError('Please select a .txt or .md file');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        currentPrompt = e.target.result;
        document.getElementById('promptTextarea').value = currentPrompt;
        document.getElementById('promptFileInfo').innerHTML = 
            `✅ <strong>${file.name}</strong> loaded`;
    };
    reader.readAsText(file);
}

// Parse PCB export (simplified version from our CLI)
function parsePCBExport(jsonData) {
    if (!jsonData.caseFile || !Array.isArray(jsonData.caseFile)) {
        throw new Error('Invalid PCB export format: missing or invalid caseFile array');
    }

    const components = jsonData.caseFile.length;
    const componentsWithContent = jsonData.caseFile.filter(([id, component]) => 
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

// Format case file for analysis
function formatCaseFileForAnalysis(caseFileArray) {
    let formattedContent = '';
    
    // Group by type
    const componentsByType = {
        GOALS: [],
        CASE: [],
        WITNESS: [],
        DOCUMENT: []
    };
    
    caseFileArray.forEach(([id, component]) => {
        if (componentsByType[component.type]) {
            componentsByType[component.type].push(component);
        }
    });
    
    // Format each type
    if (componentsByType.GOALS.length > 0) {
        formattedContent += '## LEARNING GOALS\n\n';
        componentsByType.GOALS.forEach(comp => {
            formattedContent += `### ${comp.title}\n`;
            if (comp.content) formattedContent += `${comp.content}\n`;
            formattedContent += '\n---\n\n';
        });
    }
    
    if (componentsByType.CASE.length > 0) {
        formattedContent += '## CASE DESCRIPTION\n\n';
        componentsByType.CASE.forEach(comp => {
            formattedContent += `### ${comp.title}\n`;
            if (comp.content) formattedContent += `${comp.content}\n`;
            formattedContent += '\n---\n\n';
        });
    }
    
    if (componentsByType.WITNESS.length > 0) {
        formattedContent += '## WITNESS TESTIMONIES\n\n';
        componentsByType.WITNESS.forEach(comp => {
            formattedContent += `### ${comp.title}\n`;
            if (comp.content) formattedContent += `${comp.content}\n`;
            formattedContent += '\n---\n\n';
        });
    }
    
    if (componentsByType.DOCUMENT.length > 0) {
        formattedContent += '## DOCUMENTS\n\n';
        componentsByType.DOCUMENT.forEach(comp => {
            formattedContent += `### ${comp.title}\n`;
            if (comp.content) formattedContent += `${comp.content}\n`;
            formattedContent += '\n---\n\n';
        });
    }
    
    return formattedContent;
}

// Update check button state
function updateCheckButton() {
    const checkButton = document.getElementById('checkButton');
    const previewButton = document.getElementById('previewButton');
    const apiKeyInput = document.getElementById('apiKeyInput');
    
    // Check if elements exist (might be called before DOM is ready)
    if (!checkButton || !previewButton || !apiKeyInput) return;
    
    const apiKey = apiKeyInput.value.trim();
    const hasFiles = uploadedFiles.length > 0;
    const hasApiKey = apiKey.startsWith('sk-');
    
    // Preview button - only needs files
    previewButton.disabled = !hasFiles;
    
    // Check button - needs both files and API key
    checkButton.disabled = !hasFiles || !hasApiKey;
    
    // Keep button text consistent
    checkButton.textContent = '🔍 Process & Analyze Documents';
}

// Monitor API key input (set up after DOM loaded)
function setupAPIKeyMonitor() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (apiKeyInput) {
        apiKeyInput.addEventListener('input', updateCheckButton);
    }
}

// Run consistency check with new multi-format pipeline
async function runConsistencyCheck() {
    if (uploadedFiles.length === 0 || !document.getElementById('apiKeyInput').value.trim()) {
        return;
    }

    const button = document.getElementById('checkButton');
    const outputContent = document.getElementById('outputContent');
    const exportActions = document.getElementById('exportActions');
    
    // Show loading state
    button.disabled = true;
    button.textContent = '🤖 Processing...';
    exportActions.style.display = 'none';
    
    outputContent.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <span>Step 1: Extracting content from ${uploadedFiles.length} files...</span>
        </div>
    `;

    try {
        // Step 1: Extract content from all files
        const extractedFiles = [];
        for (let i = 0; i < uploadedFiles.length; i++) {
            const fileData = uploadedFiles[i];
            outputContent.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <span>Extracting content from ${fileData.name}... (${i + 1}/${uploadedFiles.length})</span>
                </div>
            `;
            
            const extracted = await extractFileContent(fileData);
            extractedFiles.push({
                ...fileData,
                ...extracted,
                processed: true
            });
        }

        // Step 2: AI Classification and Enhancement
        outputContent.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <span>Step 2: AI is classifying and structuring documents...</span>
            </div>
        `;

        const apiKey = document.getElementById('apiKeyInput').value.trim();
        const structuredDocuments = await classifyAndStructureDocuments(extractedFiles, apiKey);

        // Step 3: Generate formatted content for consistency analysis
        outputContent.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <span>Step 3: Analyzing structured documents for inconsistencies...</span>
            </div>
        `;

        const formattedContent = formatStructuredDocuments(structuredDocuments);
        
        // Step 4: Run consistency analysis using core function
        const analysisResult = await consistencyCheckCore.analyzeConsistency({
            prompt: currentPrompt,
            content: formattedContent,
            apiKey: apiKey,
            model: document.getElementById('modelSelect').value,
            outputFormat: 'markdown' // We'll parse markdown to maintain compatibility
        });
        
        if (!analysisResult.success) {
            throw new Error(analysisResult.error);
        }
        
        // Parse results from markdown response
        const inconsistencies = parseConsistencyTable(analysisResult.data);
        
        analysisResults = {
            success: true,
            inconsistencies: inconsistencies,
            rawResponse: analysisResult.data,
            analyzedAt: analysisResult.timestamp,
            model: analysisResult.model,
            structuredDocuments: structuredDocuments,
            statistics: {
                totalFiles: uploadedFiles.length,
                processedFiles: structuredDocuments.length,
                contentLength: formattedContent.length,
                inconsistenciesFound: inconsistencies.length,
                tokensUsed: analysisResult.usage.totalTokens
            }
        };
        
        // Display results
        displayResults(analysisResults);
        exportActions.style.display = 'flex';
        
    } catch (error) {
        // Check if it's a structured error from our core function
        if (error.errorCode) {
            switch (error.errorCode) {
                case consistencyCheckCore.ERROR_CODES.INVALID_API_KEY:
                    showError('Invalid API key. Please check your OpenAI API key configuration.');
                    break;
                case consistencyCheckCore.ERROR_CODES.RATE_LIMIT:
                    showError('API rate limit exceeded. Please wait a moment and try again.');
                    break;
                case consistencyCheckCore.ERROR_CODES.MODEL_NOT_FOUND:
                    showError(`Model not available: ${error.message}`);
                    break;
                case consistencyCheckCore.ERROR_CODES.QUOTA_EXCEEDED:
                    showError('API quota exceeded. Please check your OpenAI account.');
                    break;
                default:
                    showError('Analysis failed: ' + error.message);
            }
        } else {
            showError('Analysis failed: ' + error.message);
        }
    } finally {
        button.disabled = false;
        updateCheckButton();
    }
}

// AI-powered document classification and structuring
async function classifyAndStructureDocuments(extractedFiles, apiKey) {
    const structuredDocuments = [];
    
    // Create classification prompt
    const classificationPrompt = `You are a legal document classifier and metadata extractor. Your task is to analyze the following document and extract structured information.

For each document, respond with a JSON object containing:
{
    "document_type": "witness_statement" | "contract" | "evidence" | "case_summary" | "police_report" | "financial_record" | "correspondence" | "other",
    "title": "Brief descriptive title",
    "parties": ["List of people/entities mentioned"],
    "dates": ["List of dates in YYYY-MM-DD format"],
    "locations": ["List of locations mentioned"],
    "key_facts": ["List of 3-5 most important facts"],
    "financial_amounts": ["List of monetary amounts with currency"],
    "references": ["List of other documents/cases referenced"],
    "confidence": 0.95
}

Only respond with the JSON object, no other text.

Document to analyze:
---
FILENAME: [FILENAME]
CONTENT: [CONTENT]
---`;

    for (const fileData of extractedFiles) {
        try {
            // Skip if already structured (like PCB exports)
            if (fileData.structured) {
                structuredDocuments.push({
                    ...fileData,
                    enhanced_metadata: fileData.metadata
                });
                continue;
            }
            
            // Prepare classification prompt
            const documentContent = fileData.content.substring(0, 4000); // Limit content length
            const fullPrompt = classificationPrompt
                .replace('[FILENAME]', fileData.name)
                .replace('[CONTENT]', documentContent);
            
            // Call AI for classification using core function
            const classificationResult = await consistencyCheckCore.analyzeConsistency({
                prompt: fullPrompt,
                content: '', // Content is already in the prompt
                apiKey: apiKey,
                model: 'gpt-4o-mini', // Use default model for classification
                outputFormat: 'json'
            });
            
            // Parse AI response
            let enhanced_metadata;
            if (classificationResult.success && classificationResult.data) {
                // For classification, the entire response is our metadata
                enhanced_metadata = classificationResult.data;
            } else {
                console.error('Classification failed for', fileData.name, ':', classificationResult.error);
                enhanced_metadata = {
                    document_type: 'other',
                    title: fileData.name,
                    parties: [],
                    dates: [],
                    locations: [],
                    key_facts: ['Document classification failed: ' + (classificationResult.error || 'Unknown error')],
                    financial_amounts: [],
                    references: [],
                    confidence: 0.0
                };
            }
            
            structuredDocuments.push({
                ...fileData,
                enhanced_metadata: enhanced_metadata
            });
            
        } catch (error) {
            console.error('Error classifying document', fileData.name, ':', error);
            
            // Add with minimal metadata
            structuredDocuments.push({
                ...fileData,
                enhanced_metadata: {
                    document_type: 'other',
                    title: fileData.name,
                    parties: [],
                    dates: [],
                    locations: [],
                    key_facts: ['Error occurred during classification'],
                    financial_amounts: [],
                    references: [],
                    confidence: 0.0
                }
            });
        }
    }
    
    return structuredDocuments;
}

// Format structured documents for consistency analysis
function formatStructuredDocuments(structuredDocuments) {
    let formattedContent = '# CASE FILE ANALYSIS\n\n';
    
    // Group documents by type
    const documentsByType = {};
    structuredDocuments.forEach(doc => {
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

// Note: OpenAI API calls are now handled by consistencyCheckCore.js

// Parse consistency table from AI response
function parseConsistencyTable(markdownResponse) {
    const inconsistencies = [];
    
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
                
                const inconsistency = {
                    id: `issue-${Date.now()}-${i}`,
                    sources: sources,
                    nature: cells[1].trim(),
                    suggestedFix: cells[2].trim(),
                    status: 'pending'
                };
                
                if (inconsistency.nature && inconsistency.sources.length > 0) {
                    inconsistencies.push(inconsistency);
                }
            }
        } catch (rowError) {
            console.error('Error parsing row', i, ':', rowError.message);
        }
    }
    
    return inconsistencies;
}

// Display analysis results
function displayResults(results) {
    const outputContent = document.getElementById('outputContent');
    
    if (results.inconsistencies.length === 0) {
        outputContent.innerHTML = `
            <div class="result-summary no-issues">
                <h3>✅ No Inconsistencies Found!</h3>
                <p>The AI analysis found no factual inconsistencies in your case file. Your case appears consistent across all components.</p>
            </div>
            <div style="color: #666; font-size: 14px;">
                <p><strong>Analysis Details:</strong></p>
                <ul>
                    <li>AI Model: ${results.model || 'gpt-4o-mini'}</li>
                    <li>Files processed: ${results.statistics.totalFiles || results.statistics.totalComponents || 0}</li>
                    <li>Documents structured: ${results.statistics.processedFiles || 'N/A'}</li>
                    <li>Content length: ${results.statistics.contentLength.toLocaleString()} characters</li>
                    <li>Tokens used: ${results.statistics.tokensUsed ? results.statistics.tokensUsed.toLocaleString() : 'N/A'}</li>
                    <li>Analysis completed: ${new Date(results.analyzedAt).toLocaleString()}</li>
                </ul>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="result-summary">
            <h3>⚠️ ${results.inconsistencies.length} Inconsistencies Found</h3>
            <p>The AI analysis identified ${results.inconsistencies.length} factual conflicts in your case file that should be reviewed.</p>
        </div>
    `;
    
    results.inconsistencies.forEach((issue, index) => {
        html += `
            <div class="inconsistency-item">
                <h4>${index + 1}. ${issue.nature}</h4>
                <p class="inconsistency-sources"><strong>Sources:</strong> ${issue.sources.join(', ')}</p>
                <div class="inconsistency-fix">
                    <strong>Recommended Fix:</strong><br>
                    ${issue.suggestedFix}
                </div>
            </div>
        `;
    });
    
    html += `
        <div style="color: #666; font-size: 14px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p><strong>Analysis Details:</strong></p>
            <ul>
                <li>AI Model: ${results.model || 'gpt-4o-mini'}</li>
                <li>Components analyzed: ${results.statistics.totalComponents}</li>
                <li>Content length: ${results.statistics.contentLength.toLocaleString()} characters</li>
                <li>Analysis completed: ${new Date(results.analyzedAt).toLocaleString()}</li>
            </ul>
        </div>
    `;
    
    outputContent.innerHTML = html;
}

// Show error message
function showError(message) {
    const outputContent = document.getElementById('outputContent');
    outputContent.innerHTML = `
        <div class="error">
            <strong>Error:</strong> ${message}
        </div>
    `;
}

// Reset to default prompt
function resetToDefaultPrompt() {
    currentPrompt = DEFAULT_PROMPT;
    document.getElementById('promptTextarea').value = DEFAULT_PROMPT;
    document.getElementById('promptFileInfo').innerHTML = '';
}

// Export prompt
function exportPrompt() {
    const blob = new Blob([currentPrompt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'consistency-prompt.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Export results
function exportResults(format) {
    if (!analysisResults) return;
    
    // Create timestamp for filename: YYYY-MM-DD-HHMMSS
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '').replace('T', '-');
    
    let content, filename, mimeType;
    
    if (format === 'json') {
        content = JSON.stringify(analysisResults, null, 2);
        filename = `consistency-report-${timestamp}.json`;
        mimeType = 'application/json';
    } else {
        content = exportAsMarkdown(analysisResults);
        filename = `consistency-report-${timestamp}.md`;
        mimeType = 'text/markdown';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Preview processed documents
async function previewDocuments() {
    if (uploadedFiles.length === 0) {
        showError('Please upload files first');
        return;
    }

    const outputContent = document.getElementById('outputContent');
    const exportActions = document.getElementById('exportActions');
    exportActions.style.display = 'none';
    
    outputContent.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <span>Processing ${uploadedFiles.length} files...</span>
        </div>
    `;

    try {
        // Extract content from all files
        let previewHTML = '<h3>📄 Document Processing Preview</h3>';
        previewHTML += '<p style="color: #666; margin-bottom: 20px;">This shows what content was extracted from each file and how it will be processed:</p>';
        
        for (let i = 0; i < uploadedFiles.length; i++) {
            const fileData = uploadedFiles[i];
            const extracted = await extractFileContent(fileData);
            
            previewHTML += `
                <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
                    <h4>📄 ${fileData.name}</h4>
                    <p><strong>File Type:</strong> ${fileData.type.toUpperCase()}</p>
                    <p><strong>Document Type:</strong> ${extracted.metadata.documentType || 'Unknown'}</p>
                    <p><strong>Structured:</strong> ${extracted.structured ? '✅ Yes' : '❌ No (will be processed by AI)'}</p>
                    
                    <details style="margin-top: 10px;">
                        <summary style="cursor: pointer; color: #2563eb;">Click to see extracted content (${extracted.content.length.toLocaleString()} characters)</summary>
                        <div style="background: white; padding: 10px; margin-top: 10px; border-radius: 4px; max-height: 400px; overflow-y: auto; overflow-x: auto;">
                            <pre style="font-size: 12px; white-space: pre-wrap; margin: 0;">${extracted.content}</pre>
                        </div>
                    </details>
                    
                    ${extracted.metadata ? `
                        <details style="margin-top: 10px;">
                            <summary style="cursor: pointer; color: #2563eb;">Click to see metadata</summary>
                            <pre style="background: white; padding: 10px; margin-top: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${JSON.stringify(extracted.metadata, null, 2)}</pre>
                        </details>
                    ` : ''}
                </div>
            `;
        }
        
        // Check if any DOCX files were uploaded
        const hasDOCX = uploadedFiles.some(f => f.type === 'docx');
        
        previewHTML += `
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin-top: 20px;">
                <h4>ℹ️ Processing Notes:</h4>
                <ul style="margin: 0; padding-left: 20px;">
                    ${hasDOCX ? '<li><strong>DOCX files:</strong> Currently showing placeholder text. For best results, convert to text files.</li>' : ''}
                    <li><strong>Unstructured documents:</strong> Will be processed by AI to extract parties, dates, locations, and key facts.</li>
                    <li><strong>PDF extraction:</strong> Text is extracted from PDFs automatically. Complex formatting may affect accuracy.</li>
                </ul>
            </div>
        `;
        
        outputContent.innerHTML = previewHTML;
        
    } catch (error) {
        showError('Preview failed: ' + error.message);
    }
}

// Export as markdown
function exportAsMarkdown(results) {
    const date = new Date(results.analyzedAt).toLocaleDateString();
    const time = new Date(results.analyzedAt).toLocaleTimeString();
    
    let markdown = `# Pedagogic Case Consistency Report\n`;
    markdown += `Generated: ${date} ${time}\n\n`;
    
    // Summary
    markdown += `## Summary\n`;
    markdown += `- Total Issues Found: ${results.inconsistencies.length}\n\n`;
    
    // Inconsistencies
    if (results.inconsistencies.length > 0) {
        markdown += `## Inconsistencies\n\n`;
        
        results.inconsistencies.forEach((issue, index) => {
            markdown += `### ${index + 1}. ${issue.nature}\n`;
            markdown += `**Sources:** ${issue.sources.join(', ')}\n`;
            markdown += `**Suggested Fix:** ${issue.suggestedFix}\n\n`;
        });
    } else {
        markdown += `## Result\n\n✅ No factual inconsistencies found! The case appears consistent.\n\n`;
    }
    
    return markdown;
}