#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { runMultiPassAnalysis } from './src/utils/multiPassAnalysis';

/**
 * Direct test script for merge logic - bypasses UI
 * Usage: OPENAI_API_KEY=your_key npm run test-merge
 */

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

- **Sources of Conflict**: List only the document names (e.g., "Hotel Receipt #4721", "Jane Doe's Testimony"). Do NOT include explanations or descriptions in this column.
- **Nature of Inconsistency**: Provide an explicit description of exactly what conflicts (not just the topic)
- **Recommended Fix**: Specify exactly which document/source should be modified, what specific text to change, what to change it to, and why that source was chosen for modification. Format as: "**[Document Name]**: Change '[current text]' to '[corrected text]' to match [authoritative source] because [reason]."

Now, please analyze the following legal case file and generate a comprehensive table of all FACTUAL inconsistencies you find. Remember: only flag objective contradictions about specific facts, not different viewpoints or priorities.

[CASE FILE CONTENT FOLLOWS]
`;

async function loadCaseFile(fileName: string): Promise<string> {
  const filePath = path.join(__dirname, '..', 'Downloads', fileName);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Case file not found: ${filePath}`);
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  // If it's a JSON file, parse and extract the content
  if (fileName.endsWith('.json')) {
    try {
      const jsonData = JSON.parse(fileContent);
      // Assume the JSON has a structure with case content
      return JSON.stringify(jsonData, null, 2);
    } catch (error) {
      console.warn('Failed to parse JSON, using raw content');
      return fileContent;
    }
  }
  
  return fileContent;
}

async function runTest() {
  console.log('🚀 Starting Direct Merge Test');
  console.log('================================\n');
  
  // Get API key from environment
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is required');
    console.log('Usage: OPENAI_API_KEY=your_key npm run test-merge');
    process.exit(1);
  }
  
  // Load case file
  const caseFileName = process.env.CASE_FILE || 'case-file-Full-2025-07-31.json';
  console.log(`📁 Loading case file: ${caseFileName}`);
  
  try {
    const caseContent = await loadCaseFile(caseFileName);
    console.log(`✅ Case file loaded (${caseContent.length} characters)\n`);
    
    // Test settings
    const settings = {
      model: 'gpt-4o-mini',
      numberOfPasses: 2,
      strategy: 'intersection' as const,
      temperatureSettings: {
        singlePass: 0.3,
        multiPass: 0.5,
        merge: 0.4
      }
    };
    
    console.log('⚙️ Test Settings:');
    console.log(`   Model: ${settings.model}`);
    console.log(`   Passes: ${settings.numberOfPasses}`);
    console.log(`   Strategy: ${settings.strategy}`);
    console.log(`   Temperatures: ${JSON.stringify(settings.temperatureSettings)}\n`);
    
    // Run the analysis
    console.log('🔄 Running multi-pass analysis...\n');
    
    const result = await runMultiPassAnalysis(
      DEFAULT_PROMPT,
      caseContent,
      apiKey,
      settings.model,
      settings.numberOfPasses,
      settings.strategy,
      settings.temperatureSettings,
      (stage: string, passNumber?: number, totalPasses?: number) => {
        const progressMessage = passNumber && totalPasses ? `${stage} ${passNumber}/${totalPasses}` : stage;
        console.log(`📊 Progress: ${progressMessage}`);
      },
      (cost: number, tokens: number) => {
        console.log(`💰 Cost update: $${cost.toFixed(5)} (${tokens} tokens)`);
      }
    );
    
    console.log('\n✅ Analysis completed!');
    console.log('================================\n');
    
    // Display results
    console.log('📋 FINAL RESULTS:');
    console.log(`Total Cost: $${result.totalCost.toFixed(5)}`);
    console.log(`Total Tokens: ${result.totalTokens}`);
    console.log(`Content Length: ${result.content.length} characters\n`);
    
    console.log('📄 MERGED TABLE:');
    console.log(result.content);
    
    // Display merge reasoning if available
    if (result.mergeReasoning && result.mergeReasoning.length > 0) {
      console.log('\n🧠 MERGE REASONING:');
      result.mergeReasoning.forEach((reasoning, index) => {
        console.log(`\nMerge ${index + 1}:`);
        console.log(`  Rows A: ${reasoning.totalRowsA}`);
        console.log(`  Rows B: ${reasoning.totalRowsB}`);
        console.log(`  Matches: ${reasoning.matchesFound}`);
        console.log(`  Decision: ${reasoning.finalDecision}`);
        
        if (reasoning.abstractionProcess) {
          console.log(`  Process steps: ${reasoning.abstractionProcess.length}`);
        }
      });
    }
    
    // Save results to file
    const outputFile = `test-results-${Date.now()}.md`;
    fs.writeFileSync(outputFile, result.content);
    console.log(`\n💾 Results saved to: ${outputFile}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runTest();
}