#!/usr/bin/env python3
"""
Comprehensive unit tests for the scheduling functionality
Tests the HikingEvent class and all event management functions
"""

import pytest
import sys
import os
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
import json

# Add the parent directory to the path so we can import from events
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from events.schedule import (
    HikingEvent,
    create_hiking_event,
    add_attendee_to_event,
    remove_attendee_from_event,
    get_event_details,
    list_all_events,
    get_events_by_location
)


class TestHikingEvent:
    """Test the HikingEvent class"""
    
    def test_hiking_event_creation(self):
        """Test basic HikingEvent creation"""
        event_date = datetime.now() + timedelta(days=7)
        event = HikingEvent(
            title="Test Hike",
            location="Test Trail",
            event_date=event_date,
            description="A test hiking event",
            max_attendees=10,
            difficulty_level="intermediate",
            organizer_uid="test_organizer_123"
        )
        
        assert event.title == "Test Hike"
        assert event.location == "Test Trail"
        assert event.event_date == event_date
        assert event.description == "A test hiking event"
        assert event.max_attendees == 10
        assert event.difficulty_level == "intermediate"
        assert event.organizer_uid == "test_organizer_123"
        assert event.attendees == []
        assert event.event_id is None
        assert isinstance(event.created_at, datetime)
    
    def test_hiking_event_strips_whitespace(self):
        """Test that whitespace is stripped from string fields"""
        event_date = datetime.now() + timedelta(days=7)
        event = HikingEvent(
            title="  Test Hike  ",
            location="  Test Trail  ",
            event_date=event_date,
            description="  A test hiking event  "
        )
        
        assert event.title == "Test Hike"
        assert event.location == "Test Trail"
        assert event.description == "A test hiking event"
    
    def test_hiking_event_to_dict(self):
        """Test the to_dict method"""
        event_date = datetime.now() + timedelta(days=7)
        event = HikingEvent(
            title="Test Hike",
            location="Test Trail",
            event_date=event_date,
            description="A test hiking event",
            max_attendees=15,
            difficulty_level="advanced",
            organizer_uid="test_organizer_123"
        )
        
        event_dict = event.to_dict()
        
        assert event_dict["title"] == "Test Hike"
        assert event_dict["location"] == "Test Trail"
        assert event_dict["event_date"] == event_date
        assert event_dict["description"] == "A test hiking event"
        assert event_dict["max_attendees"] == 15
        assert event_dict["difficulty_level"] == "advanced"
        assert event_dict["organizer_uid"] == "test_organizer_123"
        assert event_dict["attendees"] == []
        assert event_dict["created_at"] == event.created_at
        assert "updated_at" in event_dict


class TestCreateHikingEvent:
    """Test the create_hiking_event function"""
    
    @patch('events.schedule.db')
    def test_create_hiking_event_success(self, mock_db):
        """Test successful event creation"""
        # Mock Firestore response
        mock_doc_ref = Mock()
        mock_doc_ref.id = "test_event_123"
        mock_db.collection.return_value.add.return_value = (None, mock_doc_ref)
        
        event_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        result = create_hiking_event(
            title="Test Hike",
            location="Test Trail",
            event_date=event_date,
            description="A test hiking event",
            max_attendees=20,
            difficulty_level="beginner",
            organizer_uid="test_organizer_123"
        )
        
        assert result["success"] is True
        assert result["event_id"] == "test_event_123"
        assert result["title"] == "Test Hike"
        assert result["location"] == "Test Trail"
        assert result["max_attendees"] == 20
        assert result["difficulty_level"] == "beginner"
        assert result["organizer_uid"] == "test_organizer_123"
        assert "message" in result
        assert "timestamp" in result
    
    def test_create_hiking_event_validation_empty_fields(self):
        """Test validation for empty required fields"""
        with pytest.raises(ValueError, match="Title and location are required"):
            create_hiking_event("", "Test Trail", "2024-12-31")
        
        with pytest.raises(ValueError, match="Title and location are required"):
            create_hiking_event("Test Hike", "", "2024-12-31")
    
    def test_create_hiking_event_validation_max_attendees(self):
        """Test validation for max_attendees"""
        with pytest.raises(ValueError, match="Max attendees must be greater than 0"):
            create_hiking_event("Test Hike", "Test Trail", "2024-12-31", max_attendees=0)
        
        with pytest.raises(ValueError, match="Max attendees must be greater than 0"):
            create_hiking_event("Test Hike", "Test Trail", "2024-12-31", max_attendees=-5)
    
    def test_create_hiking_event_validation_difficulty_level(self):
        """Test validation for difficulty level"""
        with pytest.raises(ValueError, match="Difficulty level must be: beginner, intermediate, or advanced"):
            create_hiking_event("Test Hike", "Test Trail", "2024-12-31", difficulty_level="expert")
    
    def test_create_hiking_event_validation_past_date(self):
        """Test validation for past dates"""
        past_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        with pytest.raises(ValueError, match="Event date must be in the future"):
            create_hiking_event("Test Hike", "Test Trail", past_date)
    
    def test_create_hiking_event_validation_invalid_date_format(self):
        """Test validation for invalid date formats"""
        with pytest.raises(ValueError, match="Invalid date format"):
            create_hiking_event("Test Hike", "Test Trail", "invalid-date")
    
    def test_create_hiking_event_iso_format(self):
        """Test event creation with ISO format date"""
        future_date = datetime.now() + timedelta(days=7)
        iso_date = future_date.isoformat()
        
        with patch('events.schedule.db') as mock_db:
            mock_doc_ref = Mock()
            mock_doc_ref.id = "test_event_123"
            mock_db.collection.return_value.add.return_value = (None, mock_doc_ref)
            
            result = create_hiking_event(
                title="Test Hike",
                location="Test Trail",
                event_date=iso_date
            )
            
            assert result["success"] is True


class TestAddAttendeeToEvent:
    """Test the add_attendee_to_event function"""
    
    @patch('events.schedule.db')
    def test_add_attendee_success(self, mock_db):
        """Test successful attendee addition"""
        # Mock Firestore document
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "attendees": ["existing_user_123"],
            "max_attendees": 20
        }
        
        mock_doc_ref = Mock()
        mock_doc_ref.get.return_value = mock_doc
        mock_db.collection.return_value.document.return_value = mock_doc_ref
        
        result = add_attendee_to_event("test_event_123", "new_user_456", "New User")
        
        assert result["success"] is True
        assert result["event_id"] == "test_event_123"
        assert "new_user_456" in result["attendees"]
        assert "existing_user_123" in result["attendees"]
        assert "message" in result
        assert "timestamp" in result
    
    @patch('events.schedule.db')
    def test_add_attendee_event_not_found(self, mock_db):
        """Test adding attendee to non-existent event"""
        mock_doc = Mock()
        mock_doc.exists = False
        
        mock_doc_ref = Mock()
        mock_doc_ref.get.return_value = mock_doc
        mock_db.collection.return_value.document.return_value = mock_doc_ref
        
        with pytest.raises(ValueError, match="Event test_event_123 not found"):
            add_attendee_to_event("test_event_123", "new_user_456")
    
    @patch('events.schedule.db')
    def test_add_attendee_already_attending(self, mock_db):
        """Test adding attendee who is already attending"""
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "attendees": ["existing_user_123"],
            "max_attendees": 20
        }
        
        mock_doc_ref = Mock()
        mock_doc_ref.get.return_value = mock_doc
        mock_db.collection.return_value.document.return_value = mock_doc_ref
        
        with pytest.raises(ValueError, match="User is already attending this event"):
            add_attendee_to_event("test_event_123", "existing_user_123")
    
    @patch('events.schedule.db')
    def test_add_attendee_event_full(self, mock_db):
        """Test adding attendee to full event"""
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "attendees": ["user1", "user2", "user3"],
            "max_attendees": 3
        }
        
        mock_doc_ref = Mock()
        mock_doc_ref.get.return_value = mock_doc
        mock_db.collection.return_value.document.return_value = mock_doc_ref
        
        with pytest.raises(ValueError, match="Event is full \\(max 3 attendees\\)"):
            add_attendee_to_event("test_event_123", "new_user_456")


class TestRemoveAttendeeFromEvent:
    """Test the remove_attendee_from_event function"""
    
    @patch('events.schedule.db')
    def test_remove_attendee_success(self, mock_db):
        """Test successful attendee removal"""
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "attendees": ["user1", "user2", "user3"],
            "max_attendees": 20
        }
        
        mock_doc_ref = Mock()
        mock_doc_ref.get.return_value = mock_doc
        mock_db.collection.return_value.document.return_value = mock_doc_ref
        
        result = remove_attendee_from_event("test_event_123", "user2")
        
        assert result["success"] is True
        assert result["event_id"] == "test_event_123"
        assert "user2" not in result["attendees"]
        assert "user1" in result["attendees"]
        assert "user3" in result["attendees"]
        assert "message" in result
        assert "timestamp" in result
    
    @patch('events.schedule.db')
    def test_remove_attendee_event_not_found(self, mock_db):
        """Test removing attendee from non-existent event"""
        mock_doc = Mock()
        mock_doc.exists = False
        
        mock_doc_ref = Mock()
        mock_doc_ref.get.return_value = mock_doc
        mock_db.collection.return_value.document.return_value = mock_doc_ref
        
        with pytest.raises(ValueError, match="Event test_event_123 not found"):
            remove_attendee_from_event("test_event_123", "user1")
    
    @patch('events.schedule.db')
    def test_remove_attendee_not_attending(self, mock_db):
        """Test removing attendee who is not attending"""
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "attendees": ["user1", "user2"],
            "max_attendees": 20
        }
        
        mock_doc_ref = Mock()
        mock_doc_ref.get.return_value = mock_doc
        mock_db.collection.return_value.document.return_value = mock_doc_ref
        
        with pytest.raises(ValueError, match="User is not attending this event"):
            remove_attendee_from_event("test_event_123", "user3")


class TestGetEventDetails:
    """Test the get_event_details function"""
    
    @patch('events.schedule.db')
    def test_get_event_details_success(self, mock_db):
        """Test successful event details retrieval"""
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "title": "Test Hike",
            "location": "Test Trail",
            "event_date": datetime.now() + timedelta(days=7),
            "description": "A test event",
            "max_attendees": 20,
            "difficulty_level": "beginner",
            "organizer_uid": "organizer_123",
            "attendees": ["user1", "user2"],
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        mock_doc_ref = Mock()
        mock_doc_ref.get.return_value = mock_doc
        mock_db.collection.return_value.document.return_value = mock_doc_ref
        
        result = get_event_details("test_event_123")
        
        assert result is not None
        assert result["event_id"] == "test_event_123"
        assert result["title"] == "Test Hike"
        assert result["location"] == "Test Trail"
        assert result["max_attendees"] == 20
        assert result["difficulty_level"] == "beginner"
        assert len(result["attendees"]) == 2
    
    @patch('events.schedule.db')
    def test_get_event_details_not_found(self, mock_db):
        """Test getting details for non-existent event"""
        mock_doc = Mock()
        mock_doc.exists = False
        
        mock_doc_ref = Mock()
        mock_doc_ref.get.return_value = mock_doc
        mock_db.collection.return_value.document.return_value = mock_doc_ref
        
        result = get_event_details("nonexistent_event")
        
        assert result is None


class TestListAllEvents:
    """Test the list_all_events function"""
    
    @patch('events.schedule.db')
    def test_list_all_events_success(self, mock_db):
        """Test successful listing of all events"""
        # Mock Firestore stream response
        mock_event1 = Mock()
        mock_event1.id = "event1"
        mock_event1.to_dict.return_value = {
            "title": "Hike 1",
            "location": "Trail 1",
            "event_date": datetime.now() + timedelta(days=1),
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        mock_event2 = Mock()
        mock_event2.id = "event2"
        mock_event2.to_dict.return_value = {
            "title": "Hike 2",
            "location": "Trail 2",
            "event_date": datetime.now() + timedelta(days=2),
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        mock_db.collection.return_value.order_by.return_value.limit.return_value.stream.return_value = [mock_event1, mock_event2]
        
        result = list_all_events(limit=10)
        
        assert len(result) == 2
        assert result[0]["event_id"] == "event1"
        assert result[0]["title"] == "Hike 1"
        assert result[1]["event_id"] == "event2"
        assert result[1]["title"] == "Hike 2"
    
    @patch('events.schedule.db')
    def test_list_all_events_empty(self, mock_db):
        """Test listing events when none exist"""
        mock_db.collection.return_value.order_by.return_value.limit.return_value.stream.return_value = []
        
        result = list_all_events()
        
        assert result == []


class TestGetEventsByLocation:
    """Test the get_events_by_location function"""
    
    @patch('events.schedule.db')
    def test_get_events_by_location_success(self, mock_db):
        """Test successful location-based event search"""
        mock_event = Mock()
        mock_event.id = "event1"
        mock_event.to_dict.return_value = {
            "title": "Hike at Test Trail",
            "location": "Test Trail",
            "event_date": datetime.now() + timedelta(days=1),
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        mock_db.collection.return_value.where.return_value.stream.return_value = [mock_event]
        
        result = get_events_by_location("Test Trail")
        
        assert len(result) == 1
        assert result[0]["event_id"] == "event1"
        assert result[0]["title"] == "Hike at Test Trail"
        assert result[0]["location"] == "Test Trail"
    
    @patch('events.schedule.db')
    def test_get_events_by_location_not_found(self, mock_db):
        """Test location search when no events found"""
        mock_db.collection.return_value.where.return_value.stream.return_value = []
        
        result = get_events_by_location("Nonexistent Trail")
        
        assert result == []


class TestIntegrationScenarios:
    """Test integration scenarios and edge cases"""
    
    @patch('events.schedule.db')
    def test_full_event_lifecycle(self, mock_db):
        """Test complete event lifecycle: create, add attendees, remove attendee"""
        # Mock for event creation
        mock_doc_ref = Mock()
        mock_doc_ref.id = "test_event_123"
        mock_db.collection.return_value.add.return_value = (None, mock_doc_ref)
        
        # Create event
        event_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        create_result = create_hiking_event(
            title="Integration Test Hike",
            location="Integration Trail",
            event_date=event_date,
            max_attendees=3
        )
        
        assert create_result["success"] is True
        
        # Mock for adding attendees
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "attendees": [],
            "max_attendees": 3
        }
        
        mock_doc_ref = Mock()
        mock_doc_ref.get.return_value = mock_doc
        mock_db.collection.return_value.document.return_value = mock_doc_ref
        
        # Add first attendee
        add_result1 = add_attendee_to_event("test_event_123", "user1", "User One")
        assert add_result1["success"] is True
        assert "user1" in add_result1["attendees"]
        
        # Mock for adding second attendee (event now has user1)
        mock_doc.to_dict.return_value = {
            "attendees": ["user1"],
            "max_attendees": 3
        }
        
        add_result2 = add_attendee_to_event("test_event_123", "user2", "User Two")
        assert add_result2["success"] is True
        assert "user1" in add_result2["attendees"]
        assert "user2" in add_result2["attendees"]
        
        # Mock for removing first attendee
        mock_doc.to_dict.return_value = {
            "attendees": ["user1", "user2"],
            "max_attendees": 3
        }
        
        remove_result = remove_attendee_from_event("test_event_123", "user1")
        assert remove_result["success"] is True
        assert "user1" not in remove_result["attendees"]
        assert "user2" in remove_result["attendees"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
