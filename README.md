# PCB Consistency Checker

A standalone consistency analysis tool for PedagogicCaseBuilder case files. This tool extracts the AI-powered consistency checking functionality from the main PCB application into a separate, isolated environment to avoid React component issues.

## Features

- 🔍 **AI-Powered Analysis**: Uses the same sophisticated legal consistency prompts as PCB
- 📁 **PCB Export Compatible**: Reads JSON exports from PedagogicCaseBuilder (both full and student versions)
- 📊 **Multiple Output Formats**: JSON, Markdown, and CSV export options
- 🚀 **CLI Interface**: Easy command-line usage with comprehensive options
- ✅ **Validation Tools**: Verify PCB export files before analysis
- 🎯 **Isolated Environment**: No React components = no hook order issues

## Installation

```bash
cd pcb-consistency-checker
npm install
```

## Usage

### Basic Analysis

```bash
# Analyze a PCB export file
node index.js check my-case-file.json --api-key sk-your-openai-key

# Use environment variable for API key
export OPENAI_API_KEY=sk-your-openai-key
node index.js check my-case-file.json
```

### Output Options

```bash
# Save results to file in different formats
node index.js check case.json -o results.md --format markdown
node index.js check case.json -o results.csv --format csv
node index.js check case.json -o results.json --format json
```

### AI Model Options

```bash
# Use different OpenAI models and settings
node index.js check case.json --model gpt-3.5-turbo --temperature 0.1
node index.js check case.json --model gpt-4 --max-tokens 3000
```

### Validation and Testing

```bash
# Validate PCB export file format
node index.js validate my-case-file.json

# Test file parsing without AI analysis
node index.js check case.json --dry-run
```

## Input Format

The tool expects JSON files exported from PedagogicCaseBuilder with this structure:

```json
{
  "caseFile": [
    ["component-id", {
      "id": "component-id",
      "type": "GOALS|CASE|WITNESS|DOCUMENT",
      "title": "Component Title",
      "content": "Component content...",
      "dependencies": [],
      "status": "complete"
    }]
  ],
  "exportedAt": "2025-01-31T...",
  "version": "1.0",
  "exportType": "full"
}
```

## Output Formats

### JSON
Complete analysis results with metadata, statistics, and structured inconsistency data.

### Markdown  
Human-readable report with summary and detailed inconsistency list.

### CSV
Spreadsheet-friendly format for further analysis or tracking.

## How It Works

1. **Parse PCB Export**: Converts JSON export back to internal Map format
2. **Format Content**: Organizes case components by type (Goals, Case, Witness, Document)
3. **AI Analysis**: Uses OpenAI with sophisticated legal consistency prompts
4. **Parse Results**: Extracts inconsistencies from AI response table format
5. **Export**: Formats results in requested output format

## AI Consistency Prompts

The tool uses the same detailed legal analysis prompts as PedagogicCaseBuilder:

- **Focuses on factual conflicts only** (dates, numbers, locations, names)
- **Ignores different perspectives** and stakeholder disagreements  
- **Provides specific fix recommendations** for each inconsistency
- **Returns structured table format** for easy parsing

## Command Reference

### `check <file>`
Analyze a PCB case file for inconsistencies.

**Options:**
- `-k, --api-key <key>` - OpenAI API key
- `-o, --output <file>` - Output file path  
- `-f, --format <format>` - Output format (json, markdown, csv)
- `-m, --model <model>` - OpenAI model (default: gpt-4)
- `--temperature <temp>` - AI temperature 0.0-1.0 (default: 0.3)
- `--max-tokens <tokens>` - Maximum response tokens (default: 2000)
- `--dry-run` - Parse file but skip AI analysis

**Exit Codes:**
- `0` - Success (no inconsistencies found)
- `1` - Issues found or analysis failed

### `validate <file>`
Validate PCB export file format and show component breakdown.

## Examples

```bash
# Basic analysis with environment API key
export OPENAI_API_KEY=sk-your-key
node index.js check exported-case.json

# Generate markdown report
node index.js check case.json -o report.md --format markdown

# Quick validation
node index.js validate suspicious-file.json

# Conservative analysis with lower temperature
node index.js check case.json --temperature 0.1 --model gpt-4
```

## Error Handling

The tool provides detailed error messages for:
- Missing or invalid PCB export files
- OpenAI API issues (rate limits, invalid keys, timeouts)
- Empty case files or files with no content
- Invalid command line arguments

## Integration Back to PCB

Once proven stable, this standalone checker could be:
1. **Web Service**: Run as HTTP API for PCB to call
2. **Child Process**: Spawned by PCB as separate Node.js process  
3. **Code Integration**: Import functions back into PCB with better architecture

The isolation allows us to solve the consistency checking problem without React component complications.

## Development Status

- ✅ Core analysis engine extracted from PCB
- ✅ CLI interface with full option support
- ✅ Multiple output formats
- ✅ Error handling and validation
- 🔄 Testing with real PCB exports
- 📋 Web interface option (optional)

## Why Standalone?

After 6+ hours debugging React Error #310 in the integrated PCB consistency checker, we decided to isolate the AI analysis functionality. This approach:

- **Eliminates React hook order issues**
- **Preserves all AI prompt engineering work**  
- **Allows focused testing and debugging**
- **Provides integration path back to PCB**
- **Gives users immediate consistency checking capability**

Sometimes the best solution is strategic separation of concerns.