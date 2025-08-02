/**
 * Adds row numbering to markdown tables for inconsistency reference
 */
export function addTableNumbering(markdownContent: string): string {
  // Find markdown tables (pattern: starts with |, has header separator line with |---|)
  const tableRegex = /(\|[^\n]+\|\n\|[-\s|:]+\|\n)((\|[^\n]+\|\n?)+)/gm;
  
  return markdownContent.replace(tableRegex, (match, headerPart, contentPart) => {
    // Split header and content
    const headerLines = headerPart.trim().split('\n');
    const contentLines = contentPart.trim().split('\n').filter((line: string) => line.trim());
    
    if (headerLines.length < 2) return match; // Not a valid table
    
    // Add "Item #" to header
    const originalHeader = headerLines[0];
    const separatorLine = headerLines[1];
    
    // Add the number column to header
    const numberedHeader = originalHeader.replace(/^\|/, '| Item # |');
    const numberedSeparator = separatorLine.replace(/^\|/, '|:---:|');
    
    // Number each content row
    const numberedContentLines = contentLines.map((line: string, index: number) => {
      if (line.trim()) {
        const rowNumber = index + 1;
        return line.replace(/^\|/, `| **${rowNumber}** |`);
      }
      return line;
    });
    
    // Reconstruct the table
    return [
      numberedHeader,
      numberedSeparator,
      ...numberedContentLines
    ].join('\n') + '\n';
  });
}

/**
 * Removes table numbering from markdown (for original content preservation)
 */
export function removeTableNumbering(markdownContent: string): string {
  // Remove "Item #" column and row numbers
  return markdownContent
    .replace(/\| Item # \|/g, '|')
    .replace(/\|:---:\|/g, '|')
    .replace(/\| \*\*\d+\*\* \|/g, '|');
}

/**
 * Counts the number of inconsistencies in a markdown table
 */
export function countInconsistencies(markdownContent: string): number {
  const tableRegex = /\|[^\n]+\|\n\|[-\s|:]+\|\n((\|[^\n]+\|\n?)+)/gm;
  let totalCount = 0;
  
  let match;
  while ((match = tableRegex.exec(markdownContent)) !== null) {
    const contentPart = match[1];
    const contentLines = contentPart.trim().split('\n').filter(line => line.trim() && line.includes('|'));
    totalCount += contentLines.length;
  }
  
  return totalCount;
}