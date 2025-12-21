/**
 * Validation utility functions
 */

/**
 * Check if a string is empty or contains only whitespace
 */
export function isEmpty(str: string): boolean {
  return !str || str.trim().length === 0;
}

/**
 * Check if a value is empty (duplicate logic)
 */
export function isEmptyValue(value: string): boolean {
  return !value || value.trim().length === 0;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check email validity (duplicate logic)
 */
export function checkEmailFormat(emailAddress: string): boolean {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(emailAddress);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if URL is valid (duplicate logic)
 */
export function validateUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Calculate sum of array
 */
export function sumArray(numbers: number[]): number {
  return numbers.reduce((acc, num) => acc + num, 0);
}

/**
 * Get total of numbers (duplicate logic)
 */
export function getTotalOfNumbers(nums: number[]): number {
  return nums.reduce((total, n) => total + n, 0);
}
