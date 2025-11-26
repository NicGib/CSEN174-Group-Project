import time
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta, timezone
import json
import os
from dotenv import load_dotenv
from typing import List, Dict, Optional

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "secrets", ".env")
load_dotenv(env_path)

# ─────────────────────────
# 1. Firebase initialization
# ─────────────────────────
SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "secrets", "serviceAccountKey.json")

if not os.path.exists(SERVICE_ACCOUNT_PATH):
    raise FileNotFoundError(f"Service account key file not found: {SERVICE_ACCOUNT_PATH}")

if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# ─────────────────────────
# 2. Event Data Model
# ─────────────────────────
class HikingEvent:
    def __init__(self, title: str, location: str, event_date: datetime, 
                 description: str = "", max_attendees: int = 20, 
                 difficulty_level: str = "beginner", organizer_uid: str = ""):
        self.title = title.strip()
        self.location = location.strip()
        self.event_date = event_date
        self.description = description.strip()
        self.max_attendees = max_attendees
        self.difficulty_level = difficulty_level
        self.organizer_uid = organizer_uid
        self.attendees = []  # List of user UIDs
        self.created_at = datetime.now()
        self.event_id = None  # Will be set when saved to Firestore

    def to_dict(self) -> Dict:
        return {
            "title": self.title,
            "location": self.location,
            "event_date": self.event_date,
            "description": self.description,
            "max_attendees": self.max_attendees,
            "difficulty_level": self.difficulty_level,
            "organizer_uid": self.organizer_uid,
            "attendees": self.attendees,
            "created_at": self.created_at,
            "updated_at": firestore.SERVER_TIMESTAMP
        }

# ─────────────────────────
# 3. Event Management Functions
# ─────────────────────────
def create_hiking_event(title: str, location: str, event_date: str, 
                       description: str = "", max_attendees: int = 20,
                       difficulty_level: str = "beginner", organizer_uid: str = "") -> Dict:
    """
    Creates a new hiking event and stores it in Firestore.
    
    Args:
        title: Event title
        location: Event location (trail name, park, etc.)
        event_date: Event date in ISO format (YYYY-MM-DD) or datetime string
        description: Optional event description
        max_attendees: Maximum number of attendees (default: 20)
        difficulty_level: Difficulty level (beginner, intermediate, advanced)
        organizer_uid: UID of the event organizer (required)
    
    Returns:
        Dict with success status and event details
    """
    print(f"\nCreating hiking event: {title}")
    
    # Validation
    if not title.strip() or not location.strip():
        raise ValueError("Title and location are required")
    
    if not organizer_uid or not organizer_uid.strip():
        raise ValueError("Organizer UID is required")
    
    if max_attendees <= 0:
        raise ValueError("Max attendees must be greater than 0")
    
    if difficulty_level not in ["beginner", "intermediate", "advanced"]:
        raise ValueError("Difficulty level must be: beginner, intermediate, or advanced")
    
    # Parse event date
    try:
        if isinstance(event_date, str):
            if 'T' in event_date:
                # ISO format with time - handle both timezone-aware and naive formats
                if event_date.endswith('Z'):
                    # UTC timezone, convert to naive
                    date_str = event_date.replace('Z', '+00:00')
                    event_datetime = datetime.fromisoformat(date_str)
                    # Convert to naive datetime (remove timezone)
                    event_datetime = event_datetime.replace(tzinfo=None)
                elif '+' in event_date or event_date.count('-') > 2:
                    # Has timezone offset, parse and convert to naive
                    event_datetime = datetime.fromisoformat(event_date)
                    if event_datetime.tzinfo is not None:
                        event_datetime = event_datetime.replace(tzinfo=None)
                else:
                    # Naive datetime format (YYYY-MM-DDTHH:mm:ss)
                    try:
                        event_datetime = datetime.fromisoformat(event_date)
                        # Ensure it's naive
                        if event_datetime.tzinfo is not None:
                            event_datetime = event_datetime.replace(tzinfo=None)
                    except ValueError:
                        # Fallback to strptime
                        event_datetime = datetime.strptime(event_date, "%Y-%m-%dT%H:%M:%S")
            else:
                # Date only, assume 9:00 AM
                event_datetime = datetime.strptime(event_date, "%Y-%m-%d")
                event_datetime = event_datetime.replace(hour=9, minute=0, second=0)
        else:
            event_datetime = event_date
            # Convert to naive if timezone-aware
            if event_datetime.tzinfo is not None:
                event_datetime = event_datetime.replace(tzinfo=None)
    except ValueError as e:
        raise ValueError(f"Invalid date format. Use YYYY-MM-DD or ISO format: {e}")
    
    # Check if event is in the future
    # Use UTC for comparison to avoid timezone issues
    # The frontend sends UTC time, so we compare with UTC now
    from datetime import timezone
    utc_now = datetime.now(timezone.utc).replace(tzinfo=None)  # Convert to naive UTC
    if event_datetime <= utc_now:
        raise ValueError("Event date must be in the future")
    
    # Create event object
    event = HikingEvent(
        title=title,
        location=location,
        event_date=event_datetime,
        description=description,
        max_attendees=max_attendees,
        difficulty_level=difficulty_level,
        organizer_uid=organizer_uid
    )
    
    try:
        # Save to Firestore
        doc_ref = db.collection("hiking_events").add(event.to_dict())
        event.event_id = doc_ref[1].id
        
        print(f"Event created successfully with ID: {event.event_id}")
        
        return {
            "success": True,
            "event_id": event.event_id,
            "title": event.title,
            "location": event.location,
            "event_date": event.event_date.isoformat(),
            "description": event.description,
            "max_attendees": event.max_attendees,
            "difficulty_level": event.difficulty_level,
            "organizer_uid": event.organizer_uid,
            "attendees": event.attendees,
            "message": "Hiking event created successfully",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"Failed to create event: {e}")
        raise RuntimeError(f"Event creation failed: {e}")

def add_attendee_to_event(event_id: str, user_uid: str, user_name: str = "") -> Dict:
    """
    Adds a user to a hiking event's attendee list.
    
    Args:
        event_id: ID of the hiking event
        user_uid: UID of the user to add
        user_name: Optional name of the user (for display purposes)
    
    Returns:
        Dict with success status and updated attendee list
    """
    print(f"\nAdding attendee {user_name or user_uid} to event {event_id}")
    
    try:
        # Get event document
        event_ref = db.collection("hiking_events").document(event_id)
        event_doc = event_ref.get()
        
        if not event_doc.exists:
            raise ValueError(f"Event {event_id} not found")
        
        event_data = event_doc.to_dict()
        current_attendees = event_data.get("attendees", [])
        
        # Check if user is already attending
        if user_uid in current_attendees:
            raise ValueError("User is already attending this event")
        
        # Check if event is full
        max_attendees = event_data.get("max_attendees", 20)
        if len(current_attendees) >= max_attendees:
            raise ValueError(f"Event is full (max {max_attendees} attendees)")
        
        # Add user to attendees list
        current_attendees.append(user_uid)
        
        # Update event document
        event_ref.update({
            "attendees": current_attendees,
            "updated_at": firestore.SERVER_TIMESTAMP
        })
        
        print(f"Successfully added {user_name or user_uid} to event")
        
        return {
            "success": True,
            "event_id": event_id,
            "attendees": current_attendees,
            "message": f"Successfully added {user_name or user_uid} to event",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"Failed to add attendee: {e}")
        raise RuntimeError(f"Failed to add attendee: {e}")

def remove_attendee_from_event(event_id: str, user_uid: str) -> Dict:
    """
    Removes a user from a hiking event's attendee list.
    
    Args:
        event_id: ID of the hiking event
        user_uid: UID of the user to remove
    
    Returns:
        Dict with success status and updated attendee list
    """
    print(f"\nRemoving attendee {user_uid} from event {event_id}")
    
    try:
        # Get event document
        event_ref = db.collection("hiking_events").document(event_id)
        event_doc = event_ref.get()
        
        if not event_doc.exists:
            raise ValueError(f"Event {event_id} not found")
        
        event_data = event_doc.to_dict()
        current_attendees = event_data.get("attendees", [])
        
        # Check if user is attending
        if user_uid not in current_attendees:
            raise ValueError("User is not attending this event")
        
        # Remove user from attendees list
        current_attendees.remove(user_uid)
        
        # Update event document
        event_ref.update({
            "attendees": current_attendees,
            "updated_at": firestore.SERVER_TIMESTAMP
        })
        
        print(f"Successfully removed {user_uid} from event")
        
        return {
            "success": True,
            "event_id": event_id,
            "attendees": current_attendees,
            "message": f"Successfully removed {user_uid} from event",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"Failed to remove attendee: {e}")
        raise RuntimeError(f"Failed to remove attendee: {e}")

def delete_hiking_event_by_id(event_id: str) -> bool:
    """
    Delete an event by ID without checking organizer permissions.
    Used for automatic cleanup of expired events.
    
    Args:
        event_id: ID of the event to delete
    
    Returns:
        True if deleted, False if not found
    """
    try:
        event_ref = db.collection("hiking_events").document(event_id)
        event_doc = event_ref.get()
        
        if not event_doc.exists:
            return False
        
        event_ref.delete()
        print(f"Automatically deleted expired event {event_id}")
        return True
    except Exception as e:
        print(f"Error deleting event {event_id}: {e}")
        return False

def delete_hiking_event(event_id: str, organizer_uid: str) -> Dict:
    """
    Deletes a hiking event. Only the organizer can delete their event.
    
    Args:
        event_id: ID of the hiking event to delete
        organizer_uid: UID of the user attempting to delete (must be the organizer)
    
    Returns:
        Dict with success status
    """
    print(f"\nDeleting event {event_id} by organizer {organizer_uid}")
    
    try:
        # Get event document
        event_ref = db.collection("hiking_events").document(event_id)
        event_doc = event_ref.get()
        
        if not event_doc.exists:
            raise ValueError(f"Event {event_id} not found")
        
        event_data = event_doc.to_dict()
        event_organizer = event_data.get("organizer_uid", "")
        
        # Check if user is the organizer
        if event_organizer != organizer_uid:
            raise ValueError("Only the event organizer can delete this event")
        
        # Delete the event document
        event_ref.delete()
        
        print(f"Successfully deleted event {event_id}")
        
        return {
            "success": True,
            "event_id": event_id,
            "message": "Event deleted successfully",
            "timestamp": datetime.now().isoformat()
        }
        
    except ValueError as e:
        raise e
    except Exception as e:
        print(f"Failed to delete event: {e}")
        raise RuntimeError(f"Failed to delete event: {e}")

def get_event_details(event_id: str) -> Optional[Dict]:
    """
    Retrieves detailed information about a hiking event.
    
    Args:
        event_id: ID of the hiking event
    
    Returns:
        Dict with event details or None if not found
    """
    try:
        event_doc = db.collection("hiking_events").document(event_id).get()
        
        if not event_doc.exists:
            return None
        
        event_data = event_doc.to_dict()
        event_data["event_id"] = event_id
        
        # Convert Firestore timestamps to ISO strings
        if "event_date" in event_data:
            event_data["event_date"] = event_data["event_date"].isoformat()
        if "created_at" in event_data:
            event_data["created_at"] = event_data["created_at"].isoformat()
        if "updated_at" in event_data:
            event_data["updated_at"] = event_data["updated_at"].isoformat()
        
        return event_data
        
    except Exception as e:
        print(f"Error getting event details: {e}")
        return None

def list_all_events(limit: int = 50) -> List[Dict]:
    """
    Lists all hiking events, optionally limited by count.
    
    Args:
        limit: Maximum number of events to return
    
    Returns:
        List of event dictionaries
    """
    try:
        events = db.collection("hiking_events").order_by("event_date").limit(limit).stream()
        
        event_list = []
        for event in events:
            event_data = event.to_dict()
            event_data["event_id"] = event.id
            
            # Convert timestamps to ISO strings
            if "event_date" in event_data:
                event_data["event_date"] = event_data["event_date"].isoformat()
            if "created_at" in event_data:
                event_data["created_at"] = event_data["created_at"].isoformat()
            if "updated_at" in event_data:
                event_data["updated_at"] = event_data["updated_at"].isoformat()
            
            event_list.append(event_data)
        
        return event_list
        
    except Exception as e:
        print(f"Error listing events: {e}")
        return []

def get_events_by_location(location: str) -> List[Dict]:
    """
    Gets all events at a specific location.
    
    Args:
        location: Location to search for
    
    Returns:
        List of events at the specified location
    """
    try:
        events = db.collection("hiking_events").where("location", "==", location).stream()
        
        event_list = []
        for event in events:
            event_data = event.to_dict()
            event_data["event_id"] = event.id
            
            # Convert timestamps to ISO strings
            if "event_date" in event_data:
                event_data["event_date"] = event_data["event_date"].isoformat()
            if "created_at" in event_data:
                event_data["created_at"] = event_data["created_at"].isoformat()
            if "updated_at" in event_data:
                event_data["updated_at"] = event_data["updated_at"].isoformat()
            
            event_list.append(event_data)
        
        return event_list
        
    except Exception as e:
        print(f"Error getting events by location: {e}")
        return []

# ─────────────────────────
# 4. Interactive CLI for Testing
# ─────────────────────────
def interactive_event_manager():
    """Interactive CLI for testing event management functionality"""
    print("TrailMix Hiking Event Manager")
    print("=" * 50)
    
    while True:
        print("\nChoose an option:")
        print("1. Create new hiking event")
        print("2. Add attendee to event")
        print("3. Remove attendee from event")
        print("4. View event details")
        print("5. List all events")
        print("6. Find events by location")
        print("7. Delete event")
        print("8. Cleanup expired events")
        print("9. Exit")
        
        choice = input("\nEnter your choice (1-7): ").strip()
        
        if choice == "1":
            print("\nCREATE NEW HIKING EVENT")
            print("-" * 30)
            title = input("Event title: ").strip()
            location = input("Location: ").strip()
            event_date = input("Event date (YYYY-MM-DD): ").strip()
            description = input("Description (optional): ").strip()
            max_attendees = input("Max attendees (default 20): ").strip()
            difficulty = input("Difficulty (beginner/intermediate/advanced): ").strip()
            organizer_uid = input("Organizer UID (optional): ").strip()
            
            try:
                max_attendees = int(max_attendees) if max_attendees else 20
                difficulty = difficulty if difficulty else "beginner"
                
                result = create_hiking_event(
                    title=title,
                    location=location,
                    event_date=event_date,
                    description=description,
                    max_attendees=max_attendees,
                    difficulty_level=difficulty,
                    organizer_uid=organizer_uid
                )
                print(f"\nSUCCESS: {json.dumps(result, indent=2)}")
            except Exception as e:
                print(f"\nERROR: {e}")
                
        elif choice == "2":
            print("\nADD ATTENDEE TO EVENT")
            print("-" * 30)
            event_id = input("Event ID: ").strip()
            user_uid = input("User UID: ").strip()
            user_name = input("User name (optional): ").strip()
            
            try:
                result = add_attendee_to_event(event_id, user_uid, user_name)
                print(f"\nSUCCESS: {json.dumps(result, indent=2)}")
            except Exception as e:
                print(f"\nERROR: {e}")
                
        elif choice == "3":
            print("\nREMOVE ATTENDEE FROM EVENT")
            print("-" * 30)
            event_id = input("Event ID: ").strip()
            user_uid = input("User UID: ").strip()
            
            try:
                result = remove_attendee_from_event(event_id, user_uid)
                print(f"\nSUCCESS: {json.dumps(result, indent=2)}")
            except Exception as e:
                print(f"\nERROR: {e}")
                
        elif choice == "4":
            print("\nVIEW EVENT DETAILS")
            print("-" * 30)
            event_id = input("Event ID: ").strip()
            
            event_details = get_event_details(event_id)
            if event_details:
                print(f"\nEVENT DETAILS: {json.dumps(event_details, indent=2, default=str)}")
            else:
                print("\nEvent not found")
                
        elif choice == "5":
            print("\nLISTING ALL EVENTS")
            print("-" * 30)
            events = list_all_events()
            if events:
                print(f"\nFound {len(events)} events:")
                for event in events:
                    print(f"\nEvent ID: {event['event_id']}")
                    print(f"Title: {event['title']}")
                    print(f"Location: {event['location']}")
                    print(f"Date: {event['event_date']}")
                    print(f"Attendees: {len(event.get('attendees', []))}/{event.get('max_attendees', 20)}")
                    print("-" * 40)
            else:
                print("\nNo events found")
                
        elif choice == "6":
            print("\nFIND EVENTS BY LOCATION")
            print("-" * 30)
            location = input("Location to search: ").strip()
            
            events = get_events_by_location(location)
            if events:
                print(f"\nFound {len(events)} events at {location}:")
                for event in events:
                    print(f"\nEvent ID: {event['event_id']}")
                    print(f"Title: {event['title']}")
                    print(f"Date: {event['event_date']}")
                    print(f"Attendees: {len(event.get('attendees', []))}/{event.get('max_attendees', 20)}")
                    print("-" * 40)
            else:
                print(f"\nNo events found at {location}")

        elif choice == "7":
            print("\nDELETE EVENT")
            print("-" * 30)
            event_id = input("Event ID: ").strip()
            organizer_uid = input("Organizer UID: ").strip()
            result = delete_hiking_event(event_id, organizer_uid)
            print(f"\nSUCCESS: {json.dumps(result, indent=2)}")
        
        elif choice == "8":
            print("\nCLEANUP EXPIRED EVENTS")
            print("-" * 30)
            cleanup_expired_events()
            
        else:
            print("\nInvalid choice. Please try again.")

def cleanup_expired_events() -> int:
    """
    Delete events that started more than 1 hour ago.
    This function is called periodically by the scheduler.
    
    Returns:
        Number of events deleted
    """
    try:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        one_hour_ago = now - timedelta(hours=1)
        
        # Query events where event_date is less than one hour ago
        events_ref = db.collection("hiking_events")
        
        # Get all events (we'll filter in Python since Firestore datetime queries can be tricky)
        all_events = events_ref.stream()
        
        deleted_count = 0
        for event_doc in all_events:
            event_data = event_doc.to_dict()
            event_date = event_data.get("event_date")
            
            if event_date:
                # Handle Firestore Timestamp
                if hasattr(event_date, 'timestamp'):
                    event_datetime = datetime.fromtimestamp(event_date.timestamp())
                elif isinstance(event_date, datetime):
                    event_datetime = event_date
                    # Remove timezone if present
                    if event_datetime.tzinfo is not None:
                        event_datetime = event_datetime.replace(tzinfo=None)
                elif isinstance(event_date, str):
                    try:
                        event_datetime = datetime.fromisoformat(event_date.replace('Z', '+00:00'))
                        if event_datetime.tzinfo is not None:
                            event_datetime = event_datetime.replace(tzinfo=None)
                    except:
                        continue
                else:
                    continue
                
                # Check if event started more than 1 hour ago
                if event_datetime < one_hour_ago:
                    if delete_hiking_event_by_id(event_doc.id):
                        deleted_count += 1
        
        if deleted_count > 0:
            print(f"Cleanup: Deleted {deleted_count} expired event(s)")
        
        return deleted_count
    except Exception as e:
        print(f"Error during event cleanup: {e}")
        return 0

if __name__ == "__main__":
    print("Starting TrailMix Hiking Event Management System")
    print("=" * 60)
    
    # Run interactive event manager
    interactive_event_manager()