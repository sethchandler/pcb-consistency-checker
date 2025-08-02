import { create } from 'zustand';
import type { ConsistencyStore } from '../types';

// Default prompt from our vanilla version
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

export const useConsistencyStore = create<ConsistencyStore>((set) => ({
  // Initial state
  uploadedFiles: [],
  currentPrompt: DEFAULT_PROMPT,
  analysisResults: null,
  isProcessing: false,
  error: null,
  apiKey: '',
  selectedModel: 'gpt-4o-mini',
  analysisEmphasis: 'avoid-false-negatives', // Default as requested
  sessionCost: 0,
  totalTokensUsed: 0,
  numberOfPasses: 1, // Default to single pass
  passStrategy: 'union', // Default to return all found
  currentProgress: null,
  temperatureSettings: {
    singlePass: 0.3,   // Conservative for consistent results
    multiPass: 0.5,    // Moderate for balanced creativity/consistency  
    merge: 0.4         // Slightly conservative for reliable merging
  },

  // Actions
  setUploadedFiles: (files) => set({ uploadedFiles: files }),
  
  addUploadedFiles: (files) => set((state) => ({ 
    uploadedFiles: [...state.uploadedFiles, ...files] 
  })),
  
  setCurrentPrompt: (prompt) => set({ currentPrompt: prompt }),
  
  setAnalysisResults: (results) => set({ analysisResults: results }),
  
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  
  setError: (error) => set({ error }),
  
  setApiKey: (key) => set({ apiKey: key }),
  
  setSelectedModel: (model) => set({ selectedModel: model }),

  setAnalysisEmphasis: (emphasis) => set({ analysisEmphasis: emphasis }),

  setNumberOfPasses: (passes) => set({ numberOfPasses: passes }),

  setPassStrategy: (strategy) => set({ passStrategy: strategy }),

  setCurrentProgress: (progress) => set({ currentProgress: progress }),

  setTemperatureSettings: (settings) => set({ temperatureSettings: settings }),

  addToCost: (cost, tokens) => set((state) => ({
    sessionCost: state.sessionCost + cost,
    totalTokensUsed: state.totalTokensUsed + tokens,
  })),

  resetSessionCost: () => set({
    sessionCost: 0,
    totalTokensUsed: 0,
  }),
  
  reset: () => set({
    uploadedFiles: [],
    currentPrompt: DEFAULT_PROMPT,
    analysisResults: null,
    isProcessing: false,
    error: null,
    // Note: We don't reset sessionCost here - only on app launch
  }),
}))