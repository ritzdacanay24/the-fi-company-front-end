import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extract a user-friendly error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof HttpErrorResponse) {
    // RFC 7807 / Problem Details
    if (error.error?.detail) {
      return error.error.detail;
    }
    if (error.error?.message) {
      return error.error.message;
    }
    if (error.error?.validationErrors?.length) {
      const first = error.error.validationErrors[0];
      return typeof first === 'string' ? first : (first?.message ?? error.message);
    }
    if (error.status === 0) {
      return 'Unable to connect to server. Please check your internet connection.';
    }
    if (error.status === 401) return 'Session expired. Please log in again.';
    if (error.status === 403) return 'You do not have permission to perform this action.';
    if (error.status === 404) return 'Resource not found.';
    if (error.status === 409) return 'Conflict. The resource already exists.';
    if (error.status === 422) return 'Validation error. Please check your input.';
    if (error.status >= 500) return 'Server error. Please try again later.';
    return error.message || 'An unexpected error occurred.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}
