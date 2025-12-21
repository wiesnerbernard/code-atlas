/**
 * Demo helper functions for testing PR change detection
 */

/**
 * Calculate the sum of two numbers
 */
export function addNumbers(a: number, b: number): number {
  return a + b;
}

/**
 * Calculate the product of two numbers
 */
export function multiplyNumbers(a: number, b: number): number {
  return a * b;
}

/**
 * Format a user's full name
 */
export function formatUserName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

/**
 * Check if a string is empty or whitespace
 */
export function isEmptyString(str: string): boolean {
  return !str || str.trim().length === 0;
}

/**
 * Generate a greeting message
 */
export function generateGreeting(name: string, timeOfDay: 'morning' | 'afternoon' | 'evening'): string {
  const greeting = timeOfDay === 'morning' ? 'Good morning' : 
                   timeOfDay === 'afternoon' ? 'Good afternoon' : 
                   'Good evening';
  return `${greeting}, ${name}!`;
}
