import bcrypt from 'bcrypt';
import { BadRequestException } from '@nestjs/common';

/**
 * Password Utilities
 * Handles password hashing and validation using bcrypt
 * Mirrors creorx pattern for consistency
 */
export class PasswordUtil {
  /**
   * Hash a password using bcrypt
   * @param password - Plain text password to hash
   * @param saltRounds - Number of salt rounds (default: 10)
   * @returns Hashed password
   */
  static hash(password: string | null, saltRounds: number = 10): string {
    if (!password) {
      throw new BadRequestException('Password is required for hashing');
    }

    const salt = bcrypt.genSaltSync(saltRounds);
    return bcrypt.hashSync(password, salt);
  }

  /**
   * Compare a plain text password with a hash
   * @param password - Plain text password
   * @param hash - Hashed password to compare against
   * @returns True if passwords match
   */
  static compare(password: string | null, hash: string | null): boolean {
    if (!password || !hash) {
      return false;
    }

    return bcrypt.compareSync(password, hash);
  }

  /**
   * Validate password strength
   * @param password - Password to validate
   * @returns Validation result with score and requirements
   */
  static validateStrength(password: string): {
    isValid: boolean;
    score: number;
    requirements: {
      minLength: boolean;
      hasUppercase: boolean;
      hasLowercase: boolean;
      hasNumbers: boolean;
      hasSpecialChars: boolean;
    };
    suggestions: string[];
  } {
    const requirements = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const metRequirements = Object.values(requirements).filter(Boolean).length;
    const score = (metRequirements / 5) * 100;
    const isValid = metRequirements >= 4 && requirements.minLength;

    const suggestions: string[] = [];
    if (!requirements.minLength) suggestions.push('Use at least 8 characters');
    if (!requirements.hasUppercase) suggestions.push('Include uppercase letters');
    if (!requirements.hasLowercase) suggestions.push('Include lowercase letters');
    if (!requirements.hasNumbers) suggestions.push('Include numbers');
    if (!requirements.hasSpecialChars) suggestions.push('Include special characters');

    return {
      isValid,
      score,
      requirements,
      suggestions,
    };
  }
}
