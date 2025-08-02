# PCB Consistency Checker

A web-based tool for analyzing legal case files and identifying factual inconsistencies across multiple documents. This tool uses AI to help ensure that witness statements, police reports, contracts, and other legal documents tell a consistent story.

## Table of Contents

- [For Users (Law Professors)](#for-users-law-professors)
- [For Developers](#for-developers)
- [For AI Assistants](#for-ai-assistants-claude-etc)
- [Technical Architecture](#technical-architecture)
- [Troubleshooting](#troubleshooting)

---

## For Users (Law Professors)

### What This Tool Does

The PCB Consistency Checker helps you find factual inconsistencies in case files - like when one witness says the accident happened at 3:00 PM but another says 3:30 PM, or when a police report describes a "blue sedan" but testimony mentions a "green SUV."

### Getting Started

1. **Open the Tool**: 
   - Open the `index.html` file in your web browser (Chrome, Firefox, Safari, or Edge)
   - No installation or server setup required!

2. **Get an OpenAI API Key**:
   - Visit [OpenAI's API page](https://platform.openai.com/api-keys)
   - Create an account and generate an API key
   - Keep this key private - it's like a password
   - The tool will ask for this key when you first use it

3. **Prepare Your Documents**:
   - The tool accepts multiple file formats:
     - **JSON files**: From PedagogicCaseBuilder exports
     - **PDF files**: Standard PDF documents (text-based, not scanned images)
     - **Text files**: Plain text (.txt) or Markdown (.md) files
     - **Word documents**: Coming soon (currently shows placeholder)

### How to Use

1. **Upload Your Case Files**:
   - Click "Choose Files" or drag and drop multiple documents onto the upload area
   - You can upload witness statements, police reports, contracts, etc.

2. **Enter Your API Key**:
   - Paste your OpenAI API key in the secure field
   - The key is only stored in your browser, never sent to any server

3. **Preview Your Documents** (Optional):
   - Click "Preview Processed Documents" to see what text was extracted
   - Especially useful for PDFs to ensure content was read correctly
   - Shows full document content in scrollable windows

4. **Choose AI Model**:
   - **GPT-4o Mini** (default): Fast and affordable, good for most cases
   - **GPT-4o**: More expensive but better at complex analysis
   - **GPT-3.5 Turbo**: Fastest and cheapest, but less accurate

5. **Run the Analysis**:
   - Click "Process & Analyze Documents"
   - The AI will:
     - Extract content from all files
     - Identify document types (witness statement, contract, etc.)
     - Find parties, dates, locations, and key facts
     - Check for inconsistencies across all documents

6. **Review Results**:
   - See a summary of inconsistencies found
   - Each inconsistency shows:
     - Which documents conflict
     - What the specific contradiction is
     - Suggested fixes with exact text changes

7. **Export Results**:
   - **Export Markdown**: Human-readable report format
   - **Export JSON**: Structured data for further processing

### Understanding the Results

The tool looks for objective factual conflicts:
- ✅ **Will flag**: "Witness A says 3:00 PM, Witness B says 3:30 PM"
- ❌ **Won't flag**: "CEO wants profits, advocate wants affordability" (different perspectives, not contradictions)

### Customizing the Analysis

The right panel shows the AI prompt. You can:
- Edit it to focus on specific types of inconsistencies
- Save your custom prompt to a file
- Load different prompts for different case types

### Cost Considerations

Each analysis uses OpenAI's API, which charges per token (roughly per word):
- **GPT-4o Mini**: About $0.01-0.05 per analysis (recommended)
- **GPT-4o**: About $0.10-0.50 per analysis
- **GPT-3.5 Turbo**: About $0.005-0.02 per analysis

The tool shows token usage after each analysis.

---

## For Developers

### Project Structure

```
pcb-consistency-checker/
├── index.html                 # Main web interface
├── consistency-checker.js     # Main application logic
├── consistencyCheckCore.js    # Reusable core API function
├── testConsistencyCore.html   # Test page for core function
├── README.md                  # This file
└── CLAUDE.md                  # AI assistant guide
```

### Key Components

#### 1. **consistencyCheckCore.js** - Reusable API Module

The heart of the application. A standalone function that can be integrated into any project:

```javascript
const result = await consistencyCheckCore.analyzeConsistency({
    prompt: "Analysis instructions...",
    content: "Document content to analyze...",
    apiKey: "sk-...",
    model: "gpt-4o-mini",
    outputFormat: "json" // or "markdown"
});
```

Features:
- Standardized error codes (INVALID_API_KEY, RATE_LIMIT, etc.)
- Consistent response structure for both success and failure
- Token usage tracking
- Works in both Node.js and browser environments

#### 2. **consistency-checker.js** - Web Application Logic

Handles:
- Multi-format file processing (JSON, PDF, TXT, MD, DOCX)
- PDF text extraction using PDF.js
- AI-powered document classification
- Two-stage AI processing:
  1. Classification: Identify document types and extract metadata
  2. Analysis: Check for inconsistencies across all documents

#### 3. **File Processing Pipeline**

```
User uploads files → Detect format → Extract content → 
AI Classification → Structure enhancement → Consistency analysis
```

### Integration with Other Projects

To use the consistency checker in another application:

1. **Include the core function**:
```html
<script src="consistencyCheckCore.js"></script>
```

2. **Prepare your content** (gather text from your app)

3. **Call the function**:
```javascript
try {
    const result = await consistencyCheckCore.analyzeConsistency({
        prompt: customPrompt || DEFAULT_PROMPT,
        content: structuredContent,
        apiKey: userApiKey,
        model: selectedModel,
        outputFormat: 'json'
    });
    
    if (result.success) {
        // Handle result.data
    } else {
        // Handle errors using result.errorCode
        switch (result.errorCode) {
            case consistencyCheckCore.ERROR_CODES.INVALID_API_KEY:
                // Show API key dialog
                break;
            case consistencyCheckCore.ERROR_CODES.RATE_LIMIT:
                // Retry after delay
                break;
        }
    }
} catch (error) {
    // Handle unexpected errors
}
```

### Adding New File Formats

To support a new format (e.g., RTF):

1. Update `detectFileType()` in consistency-checker.js
2. Add extraction function:
```javascript
async function extractRTFContent(file) {
    // Parse RTF and return:
    return {
        content: extractedText,
        metadata: { documentType: 'rtf_document', ... },
        structured: false
    };
}
```
3. Add case to `extractFileContent()` switch statement

### API Error Codes

- `MISSING_PARAMS`: Required parameters missing
- `INVALID_API_KEY`: 401 from OpenAI
- `RATE_LIMIT`: 429 from OpenAI
- `MODEL_NOT_FOUND`: Requested model not available
- `QUOTA_EXCEEDED`: Billing/quota issues
- `NETWORK_ERROR`: Connection problems
- `PARSE_ERROR`: JSON parsing failed
- `NO_RESPONSE`: Empty AI response

---

## For AI Assistants (Claude, etc.)

### Project Context

This is a standalone web-based consistency checker that originated from debugging issues with React Error #310 in the PedagogicCaseBuilder project. After 6+ hours of debugging React hook violations, we created this separate tool using vanilla JavaScript to avoid React complexity.

### Key Design Decisions

1. **Pure Client-Side**: No server required, runs entirely in browser
2. **Vanilla JavaScript**: Avoided React/frameworks due to previous debugging nightmare
3. **Two-Stage AI Processing**: 
   - First: Classify documents and extract metadata
   - Second: Analyze for inconsistencies
4. **Modular Core Function**: `consistencyCheckCore.js` designed for reuse

### Common Tasks

#### Adding Features
- Check `consistency-checker.js` for the main pipeline
- Use `consistencyCheckCore.js` for any OpenAI API calls
- Maintain backward compatibility with PCB JSON exports

#### Debugging
- Check browser console for errors
- API errors return structured error codes
- Preview button helps diagnose extraction issues

#### Integration with PedagogicCaseBuilder
The core function was specifically designed to be dropped into PCB:
1. Import `consistencyCheckCore.js`
2. Gather content from Zustand store components
3. Format using existing `formatCaseFileForAnalysis()`
4. Call core function and display results in modal

### Important Context from Development

1. **React Error #310 History**: Original PCB integration failed due to React hook order violations. This standalone version avoids React entirely.

2. **PDF Support**: Uses PDF.js for client-side extraction. Complex PDFs may need better parsing.

3. **DOCX Placeholder**: Currently returns placeholder text. Would need docx.js or similar for real extraction.

4. **Prompt Customization**: Users can edit prompts to focus on specific inconsistency types (dates, amounts, names, etc.)

### File Processing Flow

```javascript
// 1. User uploads multiple files
handleMultipleFileUpload(files)

// 2. Extract content based on type
extractFileContent(fileData) // Returns { content, metadata, structured }

// 3. AI classification for unstructured docs
classifyAndStructureDocuments(extractedFiles, apiKey)

// 4. Format all documents
formatStructuredDocuments(structuredDocuments)

// 5. Run consistency analysis
consistencyCheckCore.analyzeConsistency({...})

// 6. Parse and display results
parseConsistencyTable(markdownResponse)
```

---

## Technical Architecture

### Dependencies

- **PDF.js**: For client-side PDF text extraction
- **OpenAI API**: For document analysis (requires API key)
- No other external dependencies - pure vanilla JavaScript

### Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires modern JavaScript features:
- async/await
- Fetch API
- ES6 modules

### Security Considerations

- API keys stored only in browser memory
- No server = no data persistence
- All processing happens client-side
- CORS may block local file:// usage (use http server if needed)

---

## Troubleshooting

### "No text found in PDF"
- PDF might be scanned images rather than text
- Try converting to text first using OCR software

### "Invalid API key"
- Check key starts with "sk-"
- Ensure no extra spaces
- Verify key is active on OpenAI dashboard

### "Rate limit exceeded"
- Wait a few minutes and try again
- Consider upgrading OpenAI plan
- Use GPT-3.5 Turbo for testing (higher limits)

### Page won't load
- Check browser console (F12) for errors
- Ensure all files are in same directory
- Try opening via web server instead of file://

### Preview button disabled
- Upload files first
- Button enables once files are selected

### High token usage
- Reduce document size
- Use GPT-4o Mini instead of GPT-4o
- Upload fewer documents at once

---

## Version History

- **v1.0**: Initial standalone version with multi-format support
- Originated from PedagogicCaseBuilder consistency check feature
- Built as vanilla JS to avoid React complexity issues