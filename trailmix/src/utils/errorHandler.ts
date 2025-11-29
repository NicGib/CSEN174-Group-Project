import { getApiBaseUrl } from '@/src/constants/api';

/**
 * Error types for better error categorization
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Enhanced error class with additional context
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public statusCode?: number,
    public originalError?: Error,
    public userFriendlyMessage?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Check if the API server is reachable
 */
export async function checkApiConnection(): Promise<boolean> {
  try {
    const baseUrl = getApiBaseUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      const response = await fetch(`${baseUrl.replace('/api/v1', '')}/docs`, {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch {
    return false;
  }
}

/**
 * Get user-friendly error message based on error type
 */
export function getUserFriendlyErrorMessage(error: Error | ApiError): string {
  if (error instanceof ApiError) {
    if (error.userFriendlyMessage) {
      return error.userFriendlyMessage;
    }

    switch (error.type) {
      case ErrorType.NETWORK:
        return 'Unable to connect to the server. Please check your internet connection and ensure the backend server is running.';
      case ErrorType.AUTHENTICATION:
        return 'Authentication failed. Please log in again.';
      case ErrorType.SERVER:
        return 'Server error occurred. Please try again later.';
      case ErrorType.CLIENT:
        return error.message || 'Invalid request. Please check your input.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  // Handle standard Error objects
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
    return 'Network error: Unable to connect to the server. Please check your connection and ensure the backend is running.';
  }
  
  if (errorMessage.includes('timeout')) {
    return 'Request timed out. The server may be slow or unreachable.';
  }
  
  if (errorMessage.includes('cors')) {
    return 'CORS error: The server may not be configured to accept requests from this origin.';
  }

  return error.message || 'An unexpected error occurred.';
}

/**
 * Get troubleshooting suggestions based on error type
 */
export function getTroubleshootingSuggestions(error: Error | ApiError): string[] {
  const suggestions: string[] = [];
  
  if (error instanceof ApiError && error.type === ErrorType.NETWORK) {
    suggestions.push('Check if the backend server is running');
    suggestions.push('Verify your network connection');
    suggestions.push('Check if the API URL is correct in your configuration');
    suggestions.push('If using a tunnel, ensure cloudflared is running');
    suggestions.push('Check firewall settings for port 8000');
  } else if (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network')) {
    suggestions.push('Ensure the backend server is running (check Docker containers)');
    suggestions.push('Verify the API base URL is accessible');
    suggestions.push('Check network connectivity');
    suggestions.push('If on mobile, ensure you\'re using the correct tunnel URL or LAN IP');
  }

  return suggestions;
}

/**
 * Enhanced fetch wrapper with better error handling
 */
export async function fetchWithErrorHandling(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: options?.signal || controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const apiError = new ApiError(
        `Network error: ${error.message}`,
        ErrorType.NETWORK,
        undefined,
        error,
        'Unable to connect to the server. Please check your connection.'
      );
      throw apiError;
    }

    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      const apiError = new ApiError(
        'Request timed out',
        ErrorType.NETWORK,
        undefined,
        error,
        'The request took too long. The server may be slow or unreachable.'
      );
      throw apiError;
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Handle API response errors with detailed error information
 */
export async function handleApiResponse(
  response: Response,
  defaultErrorMessage: string = 'Request failed'
): Promise<never> {
  let errorMessage = defaultErrorMessage;
  let errorDetail: string | undefined;

  try {
    const errorData = await response.json();
    if (errorData.detail) {
      errorDetail = typeof errorData.detail === 'string' 
        ? errorData.detail 
        : JSON.stringify(errorData.detail);
      errorMessage = errorDetail;
    } else if (errorData.message) {
      errorMessage = errorData.message;
    }
  } catch {
    // If JSON parsing fails, try to get text
    try {
      const errorText = await response.text();
      if (errorText) {
        errorDetail = errorText;
        errorMessage = errorText;
      }
    } catch {
      // Use status text as fallback
      errorMessage = response.statusText || defaultErrorMessage;
    }
  }

  // Determine error type based on status code
  let errorType: ErrorType;
  if (response.status === 401 || response.status === 403) {
    errorType = ErrorType.AUTHENTICATION;
  } else if (response.status >= 500) {
    errorType = ErrorType.SERVER;
  } else if (response.status >= 400) {
    errorType = ErrorType.CLIENT;
  } else {
    errorType = ErrorType.UNKNOWN;
  }

  const apiError = new ApiError(
    `${defaultErrorMessage} (${response.status}): ${errorMessage}`,
    errorType,
    response.status,
    undefined,
    errorDetail || errorMessage
  );

  throw apiError;
}

/**
 * Wrapper for API calls with comprehensive error handling
 */
export async function apiCall<T>(
  url: string,
  options?: RequestInit,
  customErrorMessage?: string
): Promise<T> {
  try {
    const response = await fetchWithErrorHandling(url, options);

    if (!response.ok) {
      await handleApiResponse(
        response,
        customErrorMessage || 'API request failed'
      );
    }

    return await response.json();
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Wrap other errors
    if (error instanceof Error) {
      const apiError = new ApiError(
        error.message,
        ErrorType.UNKNOWN,
        undefined,
        error
      );
      throw apiError;
    }

    // Handle unknown error types
    throw new ApiError(
      'An unknown error occurred',
      ErrorType.UNKNOWN,
      undefined,
      undefined,
      'An unexpected error occurred. Please try again.'
    );
  }
}

