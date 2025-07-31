// Standalone consistency analyzer - extracted from PedagogicCaseBuilder
import { OpenAI } from 'openai';

// Default consistency check prompt (copied from PCB)
export const DEFAULT_CONSISTENCY_PROMPT = `You are an expert legal analyst AI. Your task is to meticulously review the entirety of the provided legal case file, which includes the case summary, witness statements, and all associated documents. Your goal is to identify factual inconsistencies, contradictions, and discrepancies among these sources.

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

// Parse PedagogicCaseBuilder JSON export
export function parsePCBExport(jsonData) {
  console.log('📄 Parsing PedagogicCaseBuilder export...');
  
  if (!jsonData.caseFile || !Array.isArray(jsonData.caseFile)) {
    throw new Error('Invalid PCB export format: missing or invalid caseFile array');
  }
  
  // Convert serialized Map format back to Map
  const caseFileMap = new Map();
  for (const [id, component] of jsonData.caseFile) {
    caseFileMap.set(id, component);
  }
  
  console.log(`✅ Parsed ${caseFileMap.size} components from PCB export`);
  console.log(`📊 Export info: Version ${jsonData.version}, Type: ${jsonData.exportType}`);
  
  return {
    caseFile: caseFileMap,
    metadata: {
      exportedAt: jsonData.exportedAt,
      version: jsonData.version,
      exportType: jsonData.exportType
    }
  };
}

// Format case file for AI analysis (copied from PCB)
export function formatCaseFileForAnalysis(caseFile) {
  console.log('📄 Formatting case file for consistency analysis...');
  
  const components = Array.from(caseFile.values());
  let formattedContent = '';
  
  // Group by type for better organization
  const componentsByType = {
    GOALS: [],
    CASE: [],
    WITNESS: [],
    DOCUMENT: []
  };
  
  components.forEach(comp => {
    if (componentsByType[comp.type]) {
      componentsByType[comp.type].push(comp);
    }
  });
  
  // Format learning goals
  if (componentsByType.GOALS.length > 0) {
    formattedContent += '## LEARNING GOALS\n\n';
    componentsByType.GOALS.forEach(comp => {
      formattedContent += `### ${comp.title}\n`;
      if (comp.content) formattedContent += `${comp.content}\n`;
      formattedContent += '\n---\n\n';
    });
  }
  
  // Format case description
  if (componentsByType.CASE.length > 0) {
    formattedContent += '## CASE DESCRIPTION\n\n';
    componentsByType.CASE.forEach(comp => {
      formattedContent += `### ${comp.title}\n`;
      if (comp.content) formattedContent += `${comp.content}\n`;
      formattedContent += '\n---\n\n';
    });
  }
  
  // Format witness testimonies
  if (componentsByType.WITNESS.length > 0) {
    formattedContent += '## WITNESS TESTIMONIES\n\n';
    componentsByType.WITNESS.forEach(comp => {
      formattedContent += `### ${comp.title}\n`;
      if (comp.content) formattedContent += `${comp.content}\n`;
      formattedContent += '\n---\n\n';
    });
  }
  
  // Format documents
  if (componentsByType.DOCUMENT.length > 0) {
    formattedContent += '## DOCUMENTS\n\n';
    componentsByType.DOCUMENT.forEach(comp => {
      formattedContent += `### ${comp.title}\n`;
      if (comp.content) formattedContent += `${comp.content}\n`;
      formattedContent += '\n---\n\n';
    });
  }
  
  console.log('✅ Case file formatted, length:', formattedContent.length);
  return formattedContent;
}

// Parse AI response table (copied from PCB)
export function parseConsistencyTable(markdownResponse) {
  console.log('📊 Parsing consistency analysis response...');
  
  const inconsistencies = [];
  
  try {
    if (!markdownResponse || typeof markdownResponse !== 'string') {
      console.error('❌ Invalid response format:', typeof markdownResponse);
      return inconsistencies;
    }
    
    // Find the table in the response
    const tableMatch = markdownResponse.match(/\|[\s\S]*?\|[\s\S]*?\|[\s\S]*?\|[\s\S]*?(?=\n\n|$)/);
    if (!tableMatch) {
      console.warn('⚠️ No table found in response');
      return inconsistencies;
    }
    
    console.log('📋 Found table, parsing rows...');
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
            console.log('✅ Parsed inconsistency:', inconsistency.nature.substring(0, 50) + '...');
          }
        }
      } catch (rowError) {
        console.error('❌ Error parsing row', i, ':', rowError.message);
      }
    }
    
    console.log('✅ Successfully parsed', inconsistencies.length, 'inconsistencies');
  } catch (error) {
    console.error('❌ Error parsing table:', error.message);
  }
  
  return inconsistencies;
}

// Call OpenAI API
async function callOpenAI(prompt, apiKey, options = {}) {
  const openai = new OpenAI({
    apiKey: apiKey
  });
  
  const response = await openai.chat.completions.create({
    model: options.model || 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are an expert legal analyst specializing in identifying factual inconsistencies in case files.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: options.temperature || 0.3,
    max_tokens: options.max_tokens || 2000
  });
  
  return response.choices[0].message.content;
}

// Main analysis function
export async function analyzeConsistency(caseFile, apiKey, options = {}) {
  console.log('🤖 Starting consistency analysis...');
  
  try {
    // Format the case file
    const formattedContent = formatCaseFileForAnalysis(caseFile);
    
    if (!formattedContent || formattedContent.trim().length === 0) {
      throw new Error('No content to analyze. Case file appears to be empty.');
    }
    
    console.log('📏 Formatted content length:', formattedContent.length, 'characters');
    
    // Create full prompt
    const fullPrompt = DEFAULT_CONSISTENCY_PROMPT.replace('[CASE FILE CONTENT FOLLOWS]', formattedContent);
    
    if (fullPrompt.length > 50000) {
      console.warn('⚠️ Prompt may be too long for API:', fullPrompt.length, 'characters');
    }
    
    // Call OpenAI
    console.log('🌐 Calling OpenAI API...');
    const response = await callOpenAI(fullPrompt, apiKey, options);
    
    if (!response || response.trim().length === 0) {
      throw new Error('Empty response from AI. Please try again.');
    }
    
    // Parse the response
    const inconsistencies = parseConsistencyTable(response);
    
    console.log('✅ Analysis complete. Found', inconsistencies.length, 'inconsistencies');
    
    return {
      success: true,
      inconsistencies,
      rawResponse: response,
      analyzedAt: new Date().toISOString(),
      statistics: {
        totalComponents: caseFile.size,
        contentLength: formattedContent.length,
        promptLength: fullPrompt.length,
        inconsistenciesFound: inconsistencies.length
      }
    };
    
  } catch (error) {
    console.error('❌ Consistency analysis failed:', error.message);
    throw error;
  }
}

// Export results in various formats
export function exportResults(result, format = 'json') {
  const timestamp = new Date().toISOString();
  
  switch (format.toLowerCase()) {
    case 'json':
      return JSON.stringify(result, null, 2);
      
    case 'markdown':
      return exportAsMarkdown(result.inconsistencies, result.analyzedAt);
      
    case 'csv':
      return exportAsCSV(result.inconsistencies);
      
    default:
      throw new Error(`Unknown export format: ${format}`);
  }
}

function exportAsMarkdown(inconsistencies, analyzedAt) {
  const date = new Date(analyzedAt).toLocaleDateString();
  const time = new Date(analyzedAt).toLocaleTimeString();
  
  let markdown = `# Pedagogic Case Consistency Report\n`;
  markdown += `Generated: ${date} ${time}\n\n`;
  
  // Summary
  markdown += `## Summary\n`;
  markdown += `- Total Issues Found: ${inconsistencies.length}\n\n`;
  
  // Inconsistencies
  if (inconsistencies.length > 0) {
    markdown += `## Inconsistencies\n\n`;
    
    inconsistencies.forEach((issue, index) => {
      markdown += `### ${index + 1}. ${issue.nature}\n`;
      markdown += `**Sources:** ${issue.sources.join(', ')}\n`;
      markdown += `**Suggested Fix:** ${issue.suggestedFix}\n\n`;
    });
  } else {
    markdown += `## Result\n\n✅ No factual inconsistencies found! The case appears consistent.\n\n`;
  }
  
  return markdown;
}

function exportAsCSV(inconsistencies) {
  let csv = 'Issue #,Sources,Nature of Inconsistency,Suggested Fix\n';
  
  inconsistencies.forEach((issue, index) => {
    const sources = issue.sources.join('; ');
    const nature = issue.nature.replace(/"/g, '""');
    const fix = issue.suggestedFix.replace(/"/g, '""');
    
    csv += `${index + 1},"${sources}","${nature}","${fix}"\n`;
  });
  
  return csv;
}