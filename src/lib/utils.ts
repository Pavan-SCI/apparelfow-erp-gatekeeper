/**
 * Calculates the percentage of fabric wastage for an order.
 * @param expectedYards The theoretical fabric yards required
 * @param actualYards The actual fabric yards used
 * @returns The wastage percentage, rounded to 2 decimal places
 */
export function calculateWastagePercentage(expectedYards: number, actualYards: number): number {
  if (expectedYards <= 0) return 0;
  const wastage = ((actualYards - expectedYards) / expectedYards) * 100;
  return Number(Math.max(0, wastage).toFixed(2));
}

/**
 * Determines the traffic light status for a verification item.
 * @param expectedQty Expected quantity
 * @param actualQty Actual quantity inputted by the verifier
 * @returns 'GREEN' | 'YELLOW' | 'RED'
 */
export function getTrafficLightStatus(expectedQty: number, actualQty: number): 'GREEN' | 'YELLOW' | 'RED' {
  if (actualQty < expectedQty) return 'RED';
  if (actualQty > expectedQty) return 'YELLOW';
  return 'GREEN';
}
