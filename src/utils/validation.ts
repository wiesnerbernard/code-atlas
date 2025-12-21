/**
 * Test file for duplicate function detection
 * This file contains intentionally duplicated functions with varying similarity levels
 */

// Pair 1: 100% identical - empty check functions
export function isEmpty(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

export function isEmptyValue(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

// Pair 2: ~95% similar - minor variable name change
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function checkEmailFormat(emailAddress: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(emailAddress);
}

// Pair 3: ~90% similar - different variable names
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

// Pair 4: ~85% similar - additional condition
export function sumArray(numbers: number[]): number {
  return numbers.reduce((sum, num) => sum + num, 0);
}

export function getTotalOfNumbers(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, num) => sum + num, 0);
}

// Pair 5: ~80% similar - different default value
export function getFirstElement<T>(arr: T[]): T | null {
  return arr.length > 0 ? arr[0] : null;
}

export function firstItem<T>(items: T[]): T | undefined {
  return items.length > 0 ? items[0] : undefined;
}

// Pair 6: ~75% similar - slightly different logic
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function capitalizeString(text: string): string {
  if (text.length === 0) return '';
  return text[0].toUpperCase() + text.substring(1);
}

// Pair 7: Complex ~90% similar - nested conditions
export function processUserData(user: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!user) {
    errors.push('User is required');
    return { valid: false, errors };
  }
  
  if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
    errors.push('Invalid email');
  }
  
  if (!user.age || user.age < 18) {
    errors.push('Must be 18 or older');
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateUserInfo(userData: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!userData) {
    errors.push('User is required');
    return { valid: false, errors };
  }
  
  if (!userData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
    errors.push('Invalid email');
  }
  
  if (!userData.age || userData.age < 18) {
    errors.push('Must be 18 or older');
  }
  
  return { valid: errors.length === 0, errors };
}

// Pair 8: Complex ~70% similar - different validation logic
export function validatePassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

export function checkPasswordStrength(pwd: string): boolean {
  if (pwd.length < 8) return false;
  if (!/[A-Z]/.test(pwd)) return false;
  if (!/[a-z]/.test(pwd)) return false;
  if (!/\d/.test(pwd)) return false;
  if (!/[!@#$%^&*]/.test(pwd)) return false;
  return true;
}

// Pair 9: Complex ~85% similar - array processing
export function filterActiveUsers(users: any[]): any[] {
  return users.filter(user => {
    if (!user) return false;
    if (!user.isActive) return false;
    if (user.deletedAt) return false;
    return true;
  });
}

export function getActiveUsers(userList: any[]): any[] {
  return userList.filter(user => {
    if (!user) return false;
    if (!user.isActive) return false;
    if (user.deletedAt) return false;
    return true;
  });
}

// Pair 10: Complex ~65% similar - different approach to same problem
export function calculateDiscount(price: number, discountPercent: number): number {
  if (price <= 0) return 0;
  if (discountPercent <= 0) return price;
  if (discountPercent >= 100) return 0;
  return price - (price * discountPercent / 100);
}

export function applyDiscount(amount: number, percent: number): number {
  const validAmount = Math.max(0, amount);
  const validPercent = Math.max(0, Math.min(100, percent));
  return validAmount * (1 - validPercent / 100);
}
