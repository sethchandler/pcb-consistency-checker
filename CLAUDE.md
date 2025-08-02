# PCB Consistency Checker - AI Assistant Guide

## Quick Context

This is a standalone web app that checks legal documents for factual inconsistencies. Born from a 6+ hour React debugging nightmare (Error #310) in PedagogicCaseBuilder, we built this with vanilla JS to avoid React complexity.

## What You Need to Know

### The Origin Story
- Started as a feature in PedagogicCaseBuilder
- React hook violations caused "Rendered more hooks than during the previous render" errors
- After extensive debugging, we isolated this as a standalone tool
- Uses vanilla JavaScript, no frameworks, pure client-side

### Key Files

1. **consistencyCheckCore.js** - The golden child
   - Reusable function for any app
   - Handles all OpenAI API calls
   - Standardized error codes
   - Works in Node.js or browser

2. **consistency-checker.js** - Main app logic
   - Multi-format file processing
   - Two-stage AI pipeline
   - PDF extraction with PDF.js

3. **index.html** - Simple UI
   - Drag-and-drop file upload
   - Prompt customization
   - Preview functionality

### Architecture Decisions

```
Why vanilla JS? → React Error #310 trauma
Why client-side? → No server complexity
Why two-stage AI? → Better document understanding
Why core function? → Reuse in PedagogicCaseBuilder
```

### The Pipeline

```javascript
Files uploaded → Extract content → AI classifies docs → 
AI extracts metadata → Format everything → 
Check inconsistencies → Show results
```

### Common Tasks You'll Face

#### "Add support for new file format"
```javascript
// 1. Add to detectFileType()
'rtf': 'rtf',

// 2. Create extractor
async function extractRTFContent(file) {
  // Return { content, metadata, structured }
}

// 3. Add to switch in extractFileContent()
case 'rtf':
  return await extractRTFContent(file);
```

#### "Fix PDF extraction issues"
- Current implementation uses PDF.js
- Complex layouts may fail
- Check `extractPDFContent()` function
- Consider adding pdf-parse for Node.js version

#### "Integrate back into PedagogicCaseBuilder"
```javascript
// In PCB component:
import { analyzeConsistency } from './consistencyCheckCore.js';

// When user clicks consistency check:
const result = await analyzeConsistency({
  prompt: DEFAULT_PROMPT,
  content: formatCaseFile(components),
  apiKey: userKey,
  model: 'gpt-4o-mini',
  outputFormat: 'json'
});

// Handle result in modal
if (result.success) {
  setInconsistencies(result.data.inconsistencies);
} else {
  handleError(result.errorCode);
}
```

#### "User says it's not finding inconsistencies"
1. Check Preview - is content extracted correctly?
2. Check prompt - does it specify what to look for?
3. Check model - cheaper models miss subtleties
4. For PDFs - verify text extraction worked

### Error Handling Patterns

```javascript
// The core function returns consistent structure:
{
  success: false,
  errorCode: 'INVALID_API_KEY', // Use ERROR_CODES
  error: 'Human readable message',
  errorDetails: { ... },
  // Always includes these:
  timestamp: '...',
  model: 'gpt-4o-mini',
  format: 'json'
}
```

### Two-Stage AI Processing Explained

**Stage 1: Classification**
- Input: Raw document text
- Output: Document type, parties, dates, locations, key facts
- Purpose: Structure unstructured documents

**Stage 2: Consistency Analysis**
- Input: All structured documents
- Output: List of factual inconsistencies
- Purpose: Cross-reference all facts

### Gotchas and Warnings

1. **DOCX files** - Currently placeholder, needs real parser
2. **Large PDFs** - May timeout or use lots of tokens  
3. **Scanned PDFs** - No OCR, won't work
4. **CORS** - Use web server, not file://
5. **API Keys** - Client-side = visible in browser

### Testing Shortcuts

```bash
# Quick test server
python -m http.server 8080

# Open directly (might have CORS issues)
open index.html

# Test core function alone
open testConsistencyCore.html
```

### Prompt Engineering Tips

The default prompt is quite specific about what counts as inconsistency:
- ✅ Factual conflicts (dates, times, amounts)
- ❌ Different perspectives or opinions

Users can customize for:
- Legal document focus
- Medical record analysis  
- Financial audit checks
- Academic paper review

### Performance Optimization

```javascript
// Limit content for classification
content.substring(0, 4000) // First 4k chars

// Use cheaper models for classification
model: 'gpt-4o-mini' // Not full GPT-4

// Batch process if many files
// Currently processes sequentially
```

### State Management

No complex state! Just:
- `uploadedFiles[]` - Files user uploaded
- `currentPrompt` - The analysis prompt
- `analysisResults` - Last analysis results

### Debugging Checklist

- [ ] Check browser console for JS errors
- [ ] Verify API key is valid (starts with sk-)
- [ ] Check Preview to see extracted content
- [ ] Look at network tab for API calls
- [ ] Verify file formats are supported
- [ ] Check token usage if getting cutoffs

### Future Enhancements to Consider

1. **Real DOCX support** - Use mammoth.js or similar
2. **OCR for scanned PDFs** - Tesseract.js integration
3. **Batch processing** - Parallel API calls
4. **Progress indicators** - For each processing stage
5. **Cache results** - Avoid re-processing same docs
6. **Export templates** - Custom report formats

### Remember

This tool was born from frustration with React complexity. Keep it simple. If someone suggests "let's rewrite this in React," remind them of the 6+ hour debugging session that led to this clean, working solution.