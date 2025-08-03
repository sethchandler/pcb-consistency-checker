/**
 * Format cost as a currency string
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(5)}`;
}