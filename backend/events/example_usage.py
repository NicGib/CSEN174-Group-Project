#!/usr/bin/env python3
"""
Example script demonstrating how to use the hiking event management system.
This script shows how to create events, manage attendees, and retrieve event information.
"""

import sys
import os
from datetime import datetime, timedelta

# Add the parent directory to the path so we can import from schedule
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from events.schedule import (
    create_hiking_event,
    add_attendee_to_event,
    remove_attendee_from_event,
    get_event_details,
    list_all_events,
    get_events_by_location
)

def example_create_events():
    """Example: Create some sample hiking events"""
    print("Creating sample hiking events...")
    
    # Event 1: Weekend hike
    try:
        event1 = create_hiking_event(
            title="Weekend Mountain Trail Hike",
            location="Mount Washington State Park",
            event_date="2024-02-15",  # Next month
            description="A moderate 5-mile hike through beautiful mountain trails. Perfect for beginners!",
            max_attendees=15,
            difficulty_level="beginner",
            organizer_uid="organizer_123"
        )
        print(f"Created event: {event1['event_id']}")
        event1_id = event1['event_id']
    except Exception as e:
        print(f"Failed to create event 1: {e}")
        return None
    
    # Event 2: Advanced hike
    try:
        event2 = create_hiking_event(
            title="Advanced Summit Challenge",
            location="Eagle Peak Trail",
            event_date="2024-02-20",
            description="Challenging 12-mile hike to the summit. Experienced hikers only!",
            max_attendees=8,
            difficulty_level="advanced",
            organizer_uid="organizer_456"
        )
        print(f"Created event: {event2['event_id']}")
        event2_id = event2['event_id']
    except Exception as e:
        print(f"Failed to create event 2: {e}")
        return None
    
    return event1_id, event2_id

def example_manage_attendees(event1_id, event2_id):
    """Example: Add and remove attendees from events"""
    print("\nManaging attendees...")
    
    # Add some attendees to event 1
    attendees = [
        ("user_001", "Alice Johnson"),
        ("user_002", "Bob Smith"),
        ("user_003", "Carol Davis"),
        ("user_004", "David Wilson")
    ]
    
    for uid, name in attendees:
        try:
            result = add_attendee_to_event(event1_id, uid, name)
            print(f"Added {name} to event 1")
        except Exception as e:
            print(f"Failed to add {name}: {e}")
    
    # Add some attendees to event 2
    advanced_attendees = [
        ("user_005", "Eve Brown"),
        ("user_006", "Frank Miller")
    ]
    
    for uid, name in advanced_attendees:
        try:
            result = add_attendee_to_event(event2_id, uid, name)
            print(f"Added {name} to event 2")
        except Exception as e:
            print(f"Failed to add {name}: {e}")
    
    # Try to add someone who's already attending
    try:
        add_attendee_to_event(event1_id, "user_001", "Alice Johnson")
        print("Should have failed - user already attending")
    except ValueError as e:
        print(f"Correctly prevented duplicate: {e}")
    
    # Remove an attendee
    try:
        result = remove_attendee_from_event(event1_id, "user_003")
        print(f"Removed user_003 from event 1")
    except Exception as e:
        print(f"Failed to remove user: {e}")

def example_query_events():
    """Example: Query and display events"""
    print("\nQuerying events...")
    
    # List all events
    print("\n--- All Events ---")
    events = list_all_events()
    for event in events:
        print(f"{event['title']}")
        print(f"   Location: {event['location']}")
        print(f"   Date: {event['event_date']}")
        print(f"   Difficulty: {event['difficulty_level']}")
        print(f"   Attendees: {len(event.get('attendees', []))}/{event.get('max_attendees', 20)}")
        print()
    
    # Find events by location
    print("\n--- Events at Mount Washington State Park ---")
    location_events = get_events_by_location("Mount Washington State Park")
    for event in location_events:
        print(f"{event['title']}")
        print(f"   Date: {event['event_date']}")
        print(f"   Attendees: {len(event.get('attendees', []))}/{event.get('max_attendees', 20)}")
        print()

def example_get_event_details(event_id):
    """Example: Get detailed information about a specific event"""
    print(f"\nGetting details for event {event_id}...")
    
    details = get_event_details(event_id)
    if details:
        print("Event Details:")
        print(f"   Title: {details['title']}")
        print(f"   Location: {details['location']}")
        print(f"   Date: {details['event_date']}")
        print(f"   Description: {details['description']}")
        print(f"   Difficulty: {details['difficulty_level']}")
        print(f"   Max Attendees: {details['max_attendees']}")
        print(f"   Current Attendees: {len(details.get('attendees', []))}")
        print(f"   Attendee UIDs: {details.get('attendees', [])}")
        print(f"   Organizer: {details.get('organizer_uid', 'N/A')}")
        print(f"   Created: {details.get('created_at', 'N/A')}")
    else:
        print("Event not found")

def main():
    """Main example function"""
    print("TrailMix Hiking Event Management - Example Usage")
    print("=" * 60)
    
    try:
        # Step 1: Create sample events
        print("Step 1: Creating sample events...")
        event_ids = example_create_events()
        if not event_ids:
            print("Failed to create events. Exiting.")
            return
        
        event1_id, event2_id = event_ids
        
        # Step 2: Manage attendees
        print("\nStep 2: Managing attendees...")
        example_manage_attendees(event1_id, event2_id)
        
        # Step 3: Query events
        print("\nStep 3: Querying events...")
        example_query_events()
        
        # Step 4: Get event details
        print("\nStep 4: Getting event details...")
        example_get_event_details(event1_id)
        
        print("\nExample completed successfully!")
        print("\nYou can now:")
        print("- Run the interactive CLI: python backend/events/schedule.py")
        print("- Use the functions in your own scripts")
        print("- Integrate with your frontend application")
        
    except Exception as e:
        print(f"Example failed: {e}")
        print("Make sure you have:")
        print("1. Firebase service account key in backend/accounts/serviceAccountKey.json")
        print("2. FIREBASE_API_KEY in your .env file")
        print("3. All required dependencies installed")

if __name__ == "__main__":
    main()
