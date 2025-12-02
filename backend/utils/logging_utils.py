"""
Logging utilities for consistent logging across the application.
"""

import logging
from typing import Optional
from functools import wraps


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for a module.
    
    Args:
        name: Logger name (typically __name__)
    
    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)


def log_function_call(logger: logging.Logger, level: int = logging.DEBUG):
    """
    Decorator to log function calls with parameters and results.
    
    Args:
        logger: Logger instance
        level: Logging level (default: DEBUG)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            logger.log(level, f"Calling {func.__name__} with args={args}, kwargs={kwargs}")
            try:
                result = func(*args, **kwargs)
                logger.log(level, f"{func.__name__} completed successfully")
                return result
            except Exception as e:
                logger.error(f"{func.__name__} failed: {e}", exc_info=True)
                raise
        return wrapper
    return decorator


def log_user_action(logger: logging.Logger, user_uid: str, action: str, details: dict = None):
    """
    Log a user action for audit trail.
    
    Args:
        logger: Logger instance
        user_uid: User ID performing the action
        action: Action description (e.g., "create_event", "delete_event")
        details: Additional details about the action
    """
    log_data = {
        "user_uid": user_uid,
        "action": action,
        "details": details or {}
    }
    logger.info(f"USER_ACTION: {log_data}")


def log_error_with_context(logger: logging.Logger, error: Exception, context: dict = None):
    """
    Log an error with additional context.
    
    Args:
        logger: Logger instance
        error: Exception that occurred
        context: Additional context about the error
    """
    logger.error(
        f"Error: {type(error).__name__}: {str(error)}",
        extra={"context": context or {}},
        exc_info=True
    )

