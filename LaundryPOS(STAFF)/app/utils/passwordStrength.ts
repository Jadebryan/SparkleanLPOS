/**
 * Password Strength Checker and Generator
 */
import React from 'react';

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong'

export interface PasswordStrengthResult {
  strength: PasswordStrength
  score: number // 0-100
  feedback: string[]
  isValid: boolean
}

/**
 * Check password strength
 */
export const checkPasswordStrength = (password: string): PasswordStrengthResult => {
  const feedback: string[] = []
  let score = 0

  // Length checks
  if (password.length >= 12) {
    score += 25
  } else if (password.length >= 8) {
    score += 15
    if (password.length < 12) {
      feedback.push('Use at least 12 characters for better security')
    }
  } else {
    feedback.push('Password must be at least 8 characters')
  }

  // Lowercase letters
  if (/[a-z]/.test(password)) {
    score += 10
  } else {
    feedback.push('Add lowercase letters')
  }

  // Uppercase letters
  if (/[A-Z]/.test(password)) {
    score += 10
  } else {
    feedback.push('Add uppercase letters')
  }

  // Numbers
  if (/\d/.test(password)) {
    score += 10
  } else {
    feedback.push('Add numbers')
  }

  // Special characters
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 15
  } else {
    feedback.push('Add special characters (!@#$%^&*)')
  }

  // Bonus for variety
  const uniqueChars = new Set(password).size
  if (uniqueChars >= password.length * 0.6) {
    score += 10
  }

  // Bonus for length beyond 12
  if (password.length > 12) {
    score += Math.min(10, (password.length - 12) * 2)
  }

  // Penalty for common patterns
  if (/(.)\1{2,}/.test(password)) {
    score -= 10
    feedback.push('Avoid repeating characters')
  }

  if (/123|abc|qwe|password/i.test(password)) {
    score -= 15
    feedback.push('Avoid common sequences')
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score))

  // Determine strength level
  let strength: PasswordStrength
  if (score >= 70) {
    strength = 'strong'
  } else if (score >= 50) {
    strength = 'good'
  } else if (score >= 30) {
    strength = 'fair'
  } else {
    strength = 'weak'
  }

  // Minimum requirements for validity
  const isValid = password.length >= 8 && 
                  /[a-z]/.test(password) && 
                  /[A-Z]/.test(password) && 
                  /\d/.test(password) &&
                  /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

  // If password is strong, provide positive feedback
  if (strength === 'strong' && feedback.length === 0) {
    feedback.push('Excellent password!')
  }

  return {
    strength,
    score,
    feedback: feedback.length > 0 ? feedback : ['Password meets all requirements'],
    isValid
  }
}

/**
 * Generate a strong random password
 */
export const generateStrongPassword = (length: number = 16): string => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  
  const allChars = lowercase + uppercase + numbers + special
  
  // Ensure at least one of each type
  let password = ''
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

// Default export to prevent Expo Router from treating this as a route
const PasswordStrengthRoute = () => null;
export default PasswordStrengthRoute;

