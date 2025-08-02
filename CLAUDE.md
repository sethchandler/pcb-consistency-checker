# PCB Consistency Checker - Complete Development Guide

## Overview

A sophisticated AI-powered web application for analyzing legal documents and identifying factual inconsistencies. This project evolved from a vanilla JavaScript proof-of-concept to a modern React application with advanced multi-pass analysis capabilities.

**🌟 Live Application**: https://sethchandler.github.io/pcb-consistency-checker/

## Quick Context & Evolution

This project has two major versions:

1. **Original Vanilla JS Version** (root directory) - Simple, reliable, born from React Error #310 trauma
2. **Modern React Version** (`modern-consistency-checker/`) - Advanced features, multi-pass analysis, production deployment

The modern version is the primary application with sophisticated capabilities built through extensive development and debugging sessions.

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

---

# Modern React Version - Advanced Features & Development History

## How to Use the Modern Application

### Basic Workflow
1. **Upload Documents**: Drag and drop PDF, JSON, text, or markdown files
2. **Configure API**: Enter your OpenAI API key and select a model (gpt-4o-mini recommended)
3. **Set Analysis Parameters**:
   - Number of passes (1, 2, or 3)
   - Strategy: Union (find all) vs Intersection (find common only)
   - Temperature controls for creativity vs consistency
   - Emphasis: avoid false positives vs false negatives
4. **Run Analysis**: Click "Run Analysis" and monitor progress
5. **Review Results**: View inconsistencies in a formatted table with reasoning
6. **Export**: Download results as Markdown, JSON, or HTML

### Key Advanced Features
- **Multi-pass Analysis**: Run multiple independent analyses and merge results
- **Strategy Selection**: 
  - Union: Combines all findings from multiple passes
  - Intersection: Only keeps inconsistencies found in multiple passes
- **Temperature Controls**: Fine-tune AI creativity vs consistency for each stage
- **Cost Tracking**: Real-time cost calculation with 5-decimal precision
- **Merge Reasoning**: View step-by-step analysis of how intersection merges work
- **Table Numbering**: Automatically numbers inconsistencies for easy reference

### Advanced Configuration
- **Temperature Settings**:
  - Single Pass: Controls creativity for single-pass analysis
  - Multi Pass: Controls variation between multiple passes
  - Merge: Controls consistency when merging results
- **Smart Defaults**: Automatically optimizes temperatures based on strategy
- **Progress Tracking**: Real-time updates during analysis

## Major Development Challenges & Solutions

### 1. Multi-Pass Determinism Issue (The 398 Character Problem)
**Problem**: Multiple analysis passes with identical inputs were producing identical outputs despite different prompts.

**Root Cause**: OpenAI API was caching responses for similar requests.

**Solution**: Implemented cache-busting with:
- Unique timestamps and random seeds in prompts
- Varied analytical approaches per pass
- Temperature adjustments
- Randomized prompt prefixes with different focus areas

**What Worked**: Adding substantial variation to prompts with randomized analytical approaches.

### 2. Merge Logic Catastrophic Failure
**Problem**: LLM merge operations were producing generic, abstracted outputs instead of preserving original content.

**Critical User Feedback**: 
- "Unfortunately something is still going wrong in the merge stage"
- "That seems like subpar performance from you" 
- "I have lost trust"

**Failed Approaches**:
- Complex instruction sets with examples
- Verbose prompts with detailed explanations
- JSON response formats with nested reasoning

**Breakthrough Solution**: Adopted Gemini's "data-first" approach:
- Put data tables first in the prompt
- Simplified language and removed examples
- Clear, concise instructions
- Focus on exact text matching rather than semantic abstraction

**What Worked**: Gemini's prompt engineering approach - simplicity over complexity.

### 3. Server Stability Issues
**Problem**: Development server crashes during PDF processing and long-running analyses.

**Solution**: Switched to production builds with `nohup npm run preview` for stability.

**Created**: `STABLE-SERVER-GUIDE.md` with deployment best practices.

### 4. PDF.js Integration Nightmare
**Problem**: CORS errors and ES module conflicts when importing PDF.js.

**User Feedback**: "No you are tunnel visioning, which is your worst trait"

**Failed Approach**: Trying to use ES modules and complex import configurations.

**Solution**: Reverted to simple script tags in HTML - sometimes the simplest approach works best.

### 5. Empty Intersection Tables
**Problem**: Even with low temperatures, intersection strategy was producing empty result tables.

**Solution**: Implemented semantic abstraction protocol with strict "preserve original text" instructions.

**What Worked**: JSON response format with detailed reasoning capture for debugging merge operations.

## GitHub Pages Deployment Success

### Authentication Challenge
**Problem**: Previous experience showed GitHub CLI conflicts and token permission issues.

**Solution**: 
- Used Classic Personal Access Token with repo scope
- Avoided GitHub CLI for authentication
- Set up proper workflow permissions

### Subdirectory Deployment
**Problem**: Vite app was in `modern-consistency-checker/` subdirectory, not root.

**Solution**:
- Configured `vite.config.ts` with `base: '/pcb-consistency-checker/'`
- Updated GitHub Actions workflow to build from subdirectory
- Set GitHub Pages source to "GitHub Actions"

**Result**: ✅ Perfect deployment success on first retry after Pages configuration.

## What Worked vs What Didn't

### ✅ What Worked Well

1. **Modern Tech Stack**: Vite + React + TypeScript + Zustand proved reliable and fast
2. **Progressive Development**: Building features incrementally with user feedback
3. **Comprehensive Error Handling**: Error boundaries and file validation prevented crashes
4. **Strategy-Aware Defaults**: Smart temperature defaults optimized for each strategy's goals
5. **Debugging Infrastructure**: Extensive logging and reasoning capture for troubleshooting
6. **Cost Transparency**: Real-time cost tracking builds user trust
7. **Gemini's Prompt Engineering**: Data-first, simple instructions
8. **Production Builds**: Much more stable than development servers

### ❌ What Didn't Work

1. **Complex Prompt Engineering**: Over-detailed instructions often confused the LLM
2. **ES Module Imports for PDF.js**: Script tags were more reliable
3. **Development Server for Production**: Production builds required for stability
4. **Semantic Abstraction**: LLMs tend to abstract rather than preserve exact text
5. **Cache Assumptions**: OpenAI API caching behavior was initially underestimated
6. **Verbose Merge Instructions**: Simplicity beat complexity

## Key Lessons Learned

### Prompt Engineering
- **Data first, instructions second** (from Gemini's approach)
- **Simplicity beats complexity** in LLM instructions
- **Cache-busting is essential** for varied outputs
- **Temperature control is crucial** for different use cases

### React Development
- **Error boundaries are essential** for AI-powered apps
- **Progressive enhancement** works better than big-bang features
- **User feedback is invaluable** for UX improvements
- **Production builds** for anything beyond basic development

### AI Integration
- **Cost transparency** builds user confidence
- **Reasoning capture** enables debugging and trust
- **Multiple strategies** give users control over precision vs recall
- **Real-time progress updates** improve perceived performance

## Future Enhancements

### Planned Features
1. **TF-IDF JavaScript Merge**: Replace LLM-based merging with semantic similarity using cosine distance (proof-of-concept already built by Gemini)
2. **Advanced File Support**: DOCX, Excel, and other document formats
3. **Batch Processing**: Multiple case analysis in parallel
4. **Export Templates**: Customizable report formats
5. **Comparison Mode**: Side-by-side document analysis

### Technical Improvements
- Implement fuzzy semi-join for intersection merging
- Add document preprocessing and cleaning
- Improve mobile responsiveness
- Add keyboard shortcuts for power users

## Development Commands

```bash
# Navigate to modern version
cd modern-consistency-checker/

# Install dependencies
npm install

# Development server (use for basic testing only)
npm run dev

# Production build (recommended for stability)
npm run build && npm run preview

# Stable server (for intensive testing)
nohup npm run preview &

# Deploy to GitHub Pages (automatic on push to master)
git push origin master
```

## Repository Structure
```
pcb-consistency-checker/
├── modern-consistency-checker/     # Main React application
│   ├── src/
│   │   ├── components/            # React components
│   │   ├── store/                 # Zustand state management
│   │   ├── types/                 # TypeScript definitions
│   │   └── utils/                 # Core analysis logic
│   ├── public/                    # Static assets
│   └── dist/                      # Production build output
├── .github/workflows/             # GitHub Actions deployment
├── consistency-checker.js         # Original vanilla JS version
├── index.html                     # Original simple UI
└── CLAUDE.md                      # This development guide
```

## Architecture: Two Worlds

### Original Vanilla JS (Root Directory)
- Born from React Error #310 trauma
- Simple, reliable, client-side only
- Perfect for basic consistency checking
- Uses `consistencyCheckCore.js` for reusable functionality

### Modern React Application (modern-consistency-checker/)
- Advanced multi-pass analysis capabilities
- Professional UI with comprehensive error handling
- Real-time cost tracking and progress updates
- Production deployment with GitHub Pages
- Sophisticated state management with Zustand

## Remember: The Journey

This project represents a complete evolution from simple vanilla JavaScript to a sophisticated React application. The key insight is that **both approaches have value**:

- **Vanilla JS**: Simple, reliable, no build process
- **Modern React**: Advanced features, professional deployment, comprehensive error handling

The development process taught us that the best solutions often come from:
1. **User feedback** over assumptions
2. **Simplicity** over complexity (especially in prompts)
3. **Progressive enhancement** over big-bang features
4. **Production thinking** from day one

*When Gemini's simple prompt engineering approach solved our most challenging merge logic problem, it reminded us that sometimes the best solutions are the simplest ones.*