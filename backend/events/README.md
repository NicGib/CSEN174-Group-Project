# Hiking Event Management System

This module provides a complete system for managing hiking events with location, time, and attendee tracking using Firebase Firestore.

## Features

- Create hiking events with location, date, and details
- Manage attendee lists (add/remove users)
- Query events by location or list all events
- Get detailed event information
- Validation for event dates, capacity, and difficulty levels
- Interactive CLI for testing and management
- Firebase Firestore integration

## Quick Start

### 1. Prerequisites

Make sure you have:
- Firebase service account key at `backend/accounts/serviceAccountKey.json`
- `FIREBASE_API_KEY` in your `.env` file
- Required Python dependencies installed

### 2. Basic Usage

```python
from events.schedule import create_hiking_event, add_attendee_to_event

# Create a new hiking event
event = create_hiking_event(
    title="Weekend Mountain Hike",
    location="Mount Washington State Park",
    event_date="2024-02-15",
    description="A beautiful 5-mile hike through mountain trails",
    max_attendees=15,
    difficulty_level="beginner",
    organizer_uid="user_123"
)

# Add attendees
add_attendee_to_event(event['event_id'], "user_456", "John Doe")
add_attendee_to_event(event['event_id'], "user_789", "Jane Smith")
```

### 3. Run Examples

```bash
# Run the example script
python backend/events/example_usage.py

# Run the interactive CLI
python backend/events/schedule.py
```

## API Reference

### Core Functions

#### `create_hiking_event(title, location, event_date, ...)`
Creates a new hiking event.

**Parameters:**
- `title` (str): Event title
- `location` (str): Event location (trail name, park, etc.)
- `event_date` (str): Event date in YYYY-MM-DD format
- `description` (str, optional): Event description
- `max_attendees` (int, optional): Maximum attendees (default: 20)
- `difficulty_level` (str, optional): "beginner", "intermediate", or "advanced"
- `organizer_uid` (str, optional): UID of the event organizer

**Returns:** Dict with event details and success status

#### `add_attendee_to_event(event_id, user_uid, user_name="")`
Adds a user to an event's attendee list.

**Parameters:**
- `event_id` (str): ID of the hiking event
- `user_uid` (str): UID of the user to add
- `user_name` (str, optional): Display name for the user

**Returns:** Dict with updated attendee list

#### `remove_attendee_from_event(event_id, user_uid)`
Removes a user from an event's attendee list.

**Parameters:**
- `event_id` (str): ID of the hiking event
- `user_uid` (str): UID of the user to remove

**Returns:** Dict with updated attendee list

#### `get_event_details(event_id)`
Retrieves detailed information about a specific event.

**Parameters:**
- `event_id` (str): ID of the hiking event

**Returns:** Dict with complete event details or None if not found

#### `list_all_events(limit=50)`
Lists all hiking events, ordered by date.

**Parameters:**
- `limit` (int, optional): Maximum number of events to return

**Returns:** List of event dictionaries

#### `get_events_by_location(location)`
Finds all events at a specific location.

**Parameters:**
- `location` (str): Location to search for

**Returns:** List of events at the specified location

## Event Data Model

Each hiking event contains:

```python
{
    "event_id": "auto_generated_id",
    "title": "Event Title",
    "location": "Trail or Park Name",
    "event_date": "2024-02-15T09:00:00",
    "description": "Event description",
    "max_attendees": 20,
    "difficulty_level": "beginner|intermediate|advanced",
    "organizer_uid": "user_uid",
    "attendees": ["user_uid_1", "user_uid_2", ...],
    "created_at": "2024-01-15T10:30:00",
    "updated_at": "2024-01-15T10:30:00"
}
```

## Validation Rules

- **Title and Location**: Required fields
- **Event Date**: Must be in the future
- **Max Attendees**: Must be greater than 0
- **Difficulty Level**: Must be "beginner", "intermediate", or "advanced"
- **Attendees**: Cannot exceed max_attendees limit
- **Duplicate Attendees**: Users cannot be added twice to the same event

## Error Handling

All functions include comprehensive error handling and will raise appropriate exceptions:

- `ValueError`: For validation errors (invalid dates, missing fields, etc.)
- `RuntimeError`: For system errors (Firebase connection issues, etc.)

## Interactive CLI

The system includes a full-featured CLI for testing and management:

```bash
python backend/events/schedule.py
```

**Available Commands:**
1. Create new hiking event
2. Add attendee to event
3. Remove attendee from event
4. View event details
5. List all events
6. Find events by location
7. Exit

## Integration with Frontend

This backend system is designed to work with your React Native frontend. The event data structure matches what your frontend expects, and all functions return JSON-serializable data that can be easily consumed by your mobile app.

## Example Integration

```python
# In your Flask/FastAPI backend
from events.schedule import create_hiking_event, list_all_events

@app.route('/api/events', methods=['POST'])
def create_event():
    data = request.json
    try:
        event = create_hiking_event(
            title=data['title'],
            location=data['location'],
            event_date=data['event_date'],
            description=data.get('description', ''),
            max_attendees=data.get('max_attendees', 20),
            difficulty_level=data.get('difficulty_level', 'beginner'),
            organizer_uid=data.get('organizer_uid', '')
        )
        return jsonify(event)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/events', methods=['GET'])
def get_events():
    events = list_all_events()
    return jsonify(events)
```

## Troubleshooting

**Common Issues:**

1. **Firebase Connection Error**: Check that your service account key is in the correct location
2. **Environment Variable Missing**: Ensure `FIREBASE_API_KEY` is set in your `.env` file
3. **Date Format Error**: Use YYYY-MM-DD format for event dates
4. **Event Not Found**: Verify the event ID is correct and the event exists

**Debug Mode:**
All functions include detailed logging. Check the console output for debugging information.
