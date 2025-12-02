"""
Date and time utility functions.
"""

from datetime import datetime, timezone
from typing import Optional


def parse_event_date(date_str: str) -> datetime:
    """
    Parse an event date string into a datetime object.
    Handles multiple date formats and timezone conversions.
    
    Args:
        date_str: Date string in various formats (YYYY-MM-DD, ISO format, etc.)
    
    Returns:
        Naive datetime object (timezone removed)
    
    Raises:
        ValueError: If date format is invalid or date is in the past
    """
    if not date_str:
        raise ValueError("Date string cannot be empty")
    
    try:
        if isinstance(date_str, str):
            if 'T' in date_str:
                # ISO format with time - handle both timezone-aware and naive formats
                if date_str.endswith('Z'):
                    # UTC timezone, convert to naive
                    date_str = date_str.replace('Z', '+00:00')
                    event_datetime = datetime.fromisoformat(date_str)
                    # Convert to naive datetime (remove timezone)
                    event_datetime = event_datetime.replace(tzinfo=None)
                elif '+' in date_str or date_str.count('-') > 2:
                    # Has timezone offset, parse and convert to naive
                    event_datetime = datetime.fromisoformat(date_str)
                    if event_datetime.tzinfo is not None:
                        event_datetime = event_datetime.replace(tzinfo=None)
                else:
                    # Naive datetime format (YYYY-MM-DDTHH:mm:ss)
                    try:
                        event_datetime = datetime.fromisoformat(date_str)
                        # Ensure it's naive
                        if event_datetime.tzinfo is not None:
                            event_datetime = event_datetime.replace(tzinfo=None)
                    except ValueError:
                        # Fallback to strptime
                        event_datetime = datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%S")
            else:
                # Date only, assume 9:00 AM
                event_datetime = datetime.strptime(date_str, "%Y-%m-%d")
                event_datetime = event_datetime.replace(hour=9, minute=0, second=0)
        else:
            event_datetime = date_str
            # Convert to naive if timezone-aware
            if event_datetime.tzinfo is not None:
                event_datetime = event_datetime.replace(tzinfo=None)
    except ValueError as e:
        raise ValueError(f"Invalid date format. Use YYYY-MM-DD or ISO format: {e}")
    
    # Check if event is in the future
    utc_now = datetime.now(timezone.utc).replace(tzinfo=None)
    if event_datetime <= utc_now:
        raise ValueError("Event date must be in the future")
    
    return event_datetime


def convert_firestore_timestamp_to_iso(timestamp) -> Optional[str]:
    """
    Convert a Firestore timestamp to ISO format string.
    
    Args:
        timestamp: Firestore timestamp or datetime object
    
    Returns:
        ISO format string or None if timestamp is None
    """
    if timestamp is None:
        return None
    
    # Handle Firestore Timestamp
    if hasattr(timestamp, 'timestamp'):
        dt = datetime.fromtimestamp(timestamp.timestamp())
    elif isinstance(timestamp, datetime):
        dt = timestamp
    else:
        return None
    
    # Remove timezone if present
    if dt.tzinfo is not None:
        dt = dt.replace(tzinfo=None)
    
    return dt.isoformat()

