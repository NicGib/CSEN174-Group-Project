"""
Error handling utilities and decorators.
"""

import logging
from functools import wraps
from typing import Callable, TypeVar, Optional
from fastapi import HTTPException

from ..exceptions import (
    TrailMixException,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    ExternalServiceError,
    DatabaseError
)

logger = logging.getLogger(__name__)

F = TypeVar('F', bound=Callable)


def handle_exceptions(func: F) -> F:
    """
    Decorator to handle exceptions and convert them to appropriate HTTP exceptions.
    
    Usage:
        @handle_exceptions
        def my_endpoint():
            ...
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ValidationError as e:
            logger.warning(f"Validation error in {func.__name__}: {e.message}")
            raise HTTPException(status_code=400, detail=e.message)
        except AuthenticationError as e:
            logger.warning(f"Authentication error in {func.__name__}: {e.message}")
            raise HTTPException(status_code=401, detail=e.message)
        except AuthorizationError as e:
            logger.warning(f"Authorization error in {func.__name__}: {e.message}")
            raise HTTPException(status_code=403, detail=e.message)
        except NotFoundError as e:
            logger.info(f"Resource not found in {func.__name__}: {e.message}")
            raise HTTPException(status_code=404, detail=e.message)
        except ConflictError as e:
            logger.warning(f"Conflict in {func.__name__}: {e.message}")
            raise HTTPException(status_code=409, detail=e.message)
        except ExternalServiceError as e:
            logger.error(f"External service error in {func.__name__}: {e.service_name} - {e.message}")
            raise HTTPException(status_code=503, detail=f"Service temporarily unavailable: {e.service_name}")
        except DatabaseError as e:
            logger.error(f"Database error in {func.__name__}: {e.message}", exc_info=True)
            raise HTTPException(status_code=500, detail="Database operation failed")
        except TrailMixException as e:
            logger.error(f"TrailMix error in {func.__name__}: {e.message}", exc_info=True)
            raise HTTPException(status_code=500, detail=e.message)
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    return wrapper


def retry_on_failure(max_retries: int = 3, delay: float = 1.0, exceptions: tuple = (Exception,)):
    """
    Decorator to retry a function on failure.
    
    Args:
        max_retries: Maximum number of retry attempts
        delay: Delay between retries in seconds
        exceptions: Tuple of exceptions to catch and retry on
    """
    def decorator(func: F) -> F:
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        logger.warning(
                            f"Attempt {attempt + 1}/{max_retries} failed for {func.__name__}: {e}. Retrying..."
                        )
                        import time
                        time.sleep(delay * (attempt + 1))  # Exponential backoff
                    else:
                        logger.error(f"All {max_retries} attempts failed for {func.__name__}")
            raise last_exception
        return wrapper
    return decorator

