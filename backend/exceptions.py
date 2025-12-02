"""
Custom exception hierarchy for TrailMix backend.

Provides structured exception handling with proper error categorization.
"""


class TrailMixException(Exception):
    """Base exception for all TrailMix-specific errors."""
    
    def __init__(self, message: str, error_code: str = None, details: dict = None):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.details = details or {}


class ValidationError(TrailMixException):
    """Raised when input validation fails."""
    pass


class AuthenticationError(TrailMixException):
    """Raised when authentication fails."""
    pass


class AuthorizationError(TrailMixException):
    """Raised when user lacks permission for an action."""
    pass


class NotFoundError(TrailMixException):
    """Raised when a requested resource is not found."""
    pass


class ConflictError(TrailMixException):
    """Raised when a resource conflict occurs (e.g., duplicate username)."""
    pass


class ExternalServiceError(TrailMixException):
    """Raised when an external service call fails."""
    
    def __init__(self, message: str, service_name: str, error_code: str = None, details: dict = None):
        super().__init__(message, error_code, details)
        self.service_name = service_name


class DatabaseError(TrailMixException):
    """Raised when a database operation fails."""
    pass


class ConfigurationError(TrailMixException):
    """Raised when configuration is invalid or missing."""
    pass

