/**
 * TF-IDF based merge implementation for local similarity matching
 * Based on cosine similarity between document vectors
 */

// Stop words to ignore in similarity calculations
// NOTE: Numbers are NOT stop words as they're critical for identifying inconsistencies
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'the', 'in', 'is', 'it', 'to', 'of', 'for', 'on', 'with', 
  'as', 'by', 'that', 'this', 'was', 'were', 'be', 'been', 'being', 'have', 
  'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
  'might', 'must', 'can', 'shall', 'or', 'but', 'if', 'then', 'else', 'when',
  'at', 'from', 'up', 'out', 'over', 'under', 'again', 'further', 'too', 'very',
  'br' // HTML break tag that might appear
]);

/**
 * Parse markdown table into array of row objects
 */
export function parseMarkdownTable(markdown: string): Array<{
  sources: string;
  nature: string;
  recommendedFix: string;
}> {
  const lines = markdown.split('\n').filter(line => line.trim());
  const rows: Array<{ sources: string; nature: string; recommendedFix: string }> = [];
  
  // Skip header and separator lines, parse data rows
  let inTable = false;
  for (const line of lines) {
    if (line.includes('Sources of Conflict') && line.includes('Nature of Inconsistency')) {
      inTable = true;
      continue;
    }
    if (inTable && line.includes('|---')) {
      continue; // Skip separator
    }
    if (inTable && line.startsWith('|') && !line.includes('|---|')) {
      const parts = line.split('|').filter(p => p.trim());
      if (parts.length >= 3) {
        rows.push({
          sources: parts[0].trim(),
          nature: parts[1].trim(),
          recommendedFix: parts[2].trim()
        });
      }
    }
  }
  
  return rows;
}

/**
 * Tokenize text into words, removing stop words and punctuation
 * Preserves numbers and dates as they're critical for inconsistency detection
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\-]/g, ' ')  // Preserve hyphens for dates like 2024-01-15
    .split(/\s+/)
    .filter(word => word && !STOP_WORDS.has(word));
}

/**
 * Build vocabulary from all documents
 */
function buildVocabulary(documents: string[]): string[] {
  const vocab = new Set<string>();
  documents.forEach(doc => {
    tokenize(doc).forEach(token => vocab.add(token));
  });
  return Array.from(vocab);
}

/**
 * Calculate term frequency for a term in a document
 */
function calculateTF(tokens: string[], term: string): number {
  const count = tokens.filter(t => t === term).length;
  return tokens.length > 0 ? count / tokens.length : 0;
}

/**
 * Calculate inverse document frequency for a term across all documents
 */
function calculateIDF(documents: string[], term: string): number {
  const docsWithTerm = documents.filter(doc => 
    tokenize(doc).includes(term)
  ).length;
  return Math.log(documents.length / (1 + docsWithTerm));
}

/**
 * Create TF-IDF vector for a document
 */
function createTfIdfVector(
  doc: string, 
  vocab: string[], 
  idfScores: Record<string, number>
): number[] {
  const tokens = tokenize(doc);
  return vocab.map(term => {
    const tf = calculateTF(tokens, term);
    const idf = idfScores[term] || 0;
    return tf * idf;
  });
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Perform TF-IDF based merge of two analysis results
 * Returns rows from tableA that have a semantically similar "Recommended Fix" in tableB
 */
export function tfIdfMerge(
  resultA: string,
  resultB: string,
  theta: number = 0.2
): { content: string; matchDetails: Array<{ similarity: number; rowA: any; rowB: any }> } {
  
  // Parse tables
  const tableA = parseMarkdownTable(resultA);
  const tableB = parseMarkdownTable(resultB);
  
  if (tableA.length === 0 || tableB.length === 0) {
    return {
      content: '| Sources of Conflict | Nature of Inconsistency | Recommended Fix |\n|---|---|---|',
      matchDetails: []
    };
  }
  
  // Extract "Recommended Fix" column for similarity comparison
  const docsA = tableA.map(row => row.recommendedFix);
  const docsB = tableB.map(row => row.recommendedFix);
  const allDocs = [...docsA, ...docsB];
  
  // Build vocabulary and calculate IDF scores
  const vocab = buildVocabulary(allDocs);
  
  const idfScores: Record<string, number> = {};
  vocab.forEach(term => {
    idfScores[term] = calculateIDF(allDocs, term);
  });
  
  // Create TF-IDF vectors
  const vectorsA = docsA.map(doc => createTfIdfVector(doc, vocab, idfScores));
  const vectorsB = docsB.map(doc => createTfIdfVector(doc, vocab, idfScores));
  
  // Find matches using cosine similarity
  const matchedRows: typeof tableA = [];
  const matchDetails: Array<{ similarity: number; rowA: any; rowB: any }> = [];
  
  for (let i = 0; i < tableA.length; i++) {
    let bestMatch = { similarity: 0, indexB: -1 };
    
    for (let j = 0; j < tableB.length; j++) {
      const similarity = cosineSimilarity(vectorsA[i], vectorsB[j]);
      
      if (similarity > bestMatch.similarity) {
        bestMatch = { similarity, indexB: j };
      }
    }
    
    if (bestMatch.similarity >= theta) {
      matchedRows.push(tableA[i]);
      matchDetails.push({
        similarity: bestMatch.similarity,
        rowA: tableA[i],
        rowB: tableB[bestMatch.indexB]
      });
    }
  }
  
  
  // Reconstruct markdown table
  let resultTable = '| Sources of Conflict | Nature of Inconsistency | Recommended Fix |\n|---|---|---|\n';
  
  if (matchedRows.length > 0) {
    matchedRows.forEach(row => {
      resultTable += `| ${row.sources} | ${row.nature} | ${row.recommendedFix} |\n`;
    });
  }
  
  return {
    content: resultTable,
    matchDetails
  };
}

/**
 * Simple client-side union of multiple analysis results (no similarity matching needed)
 */
export function simpleUnionMerge(results: string[]): string {
  // For union strategy, we simply concatenate all tables
  const allRows: Array<{ sources: string; nature: string; recommendedFix: string }> = [];
  const seenFixes = new Set<string>();
  
  results.forEach(result => {
    const rows = parseMarkdownTable(result);
    rows.forEach(row => {
      // Basic deduplication based on exact recommendedFix text
      const fixKey = row.recommendedFix.toLowerCase().trim();
      if (!seenFixes.has(fixKey)) {
        seenFixes.add(fixKey);
        allRows.push(row);
      }
    });
  });
  
  if (allRows.length === 0) {
    return '| Sources of Conflict | Nature of Inconsistency | Recommended Fix |\n|---|---|---|';
  }
  
  // Reconstruct table
  let resultTable = '| Sources of Conflict | Nature of Inconsistency | Recommended Fix |\n|---|---|---|\n';
  allRows.forEach(row => {
    resultTable += `| ${row.sources} | ${row.nature} | ${row.recommendedFix} |\n`;
  });
  
  return resultTable;
}