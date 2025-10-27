#!/usr/bin/env python3
"""
School Unit Tests for TrailMix Backend
5 most important tests from each category: sign-in, sign-up, event creation, and map downloading
Each category has 1 valid test and 4 invalid input tests
"""

import pytest
import sys
import os
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock

# Add the parent directory to the path so we can import from backend modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the modules we're testing
from accounts.signups import signup_with_email_password, login_with_email_password
from events.schedule import create_hiking_event
from maps.download_map import validate_latitude, validate_longitude, validate_zoom, fetch_osm_data


class TestSignUp:
    """Tests for user signup functionality"""
    
    @patch('accounts.signups.auth')
    @patch('accounts.signups.create_user_profile')
    @patch('accounts.signups._is_username_taken')
    def test_signup_valid_inputs(self, mock_username_taken, mock_create_profile, mock_auth):
        """Test 1: Valid signup with all correct inputs"""
        # Mock username not taken
        mock_username_taken.return_value = False
        
        # Mock Firebase Auth user creation
        mock_user_record = Mock()
        mock_user_record.uid = "test_uid_123"
        mock_user_record.email = "john@example.com"  # This should match the input email
        mock_auth.create_user.return_value = mock_user_record
        
        result = signup_with_email_password(
            name="John Doe",
            username="johndoe",
            email="john@example.com",
            password="password123"
        )
        
        assert result["success"] is True
        assert result["uid"] == "test_uid_123"
        assert result["email"] == "john@example.com"  # Email is normalized to lowercase
        assert result["name"] == "John Doe"
        assert result["username"] == "johndoe"
    
    def test_signup_empty_name(self):
        """Test 2: Signup with empty name should fail"""
        with pytest.raises(ValueError, match="Please fill in all fields"):
            signup_with_email_password(
                name="",
                username="johndoe",
                email="john@example.com",
                password="password123"
            )
    
    def test_signup_short_password(self):
        """Test 3: Signup with password too short should fail"""
        with pytest.raises(ValueError, match="Password must be at least 6 characters long"):
            signup_with_email_password(
                name="John Doe",
                username="johndoe",
                email="john@example.com",
                password="123"
            )
    
    @patch('accounts.signups._is_username_taken')
    def test_signup_username_taken(self, mock_username_taken):
        """Test 4: Signup with taken username should fail"""
        mock_username_taken.return_value = True
        
        with pytest.raises(ValueError, match="Username 'johndoe' is already taken"):
            signup_with_email_password(
                name="John Doe",
                username="johndoe",
                email="john@example.com",
                password="password123"
            )
    
    def test_signup_empty_email(self):
        """Test 5: Signup with empty email should fail"""
        with pytest.raises(ValueError, match="Please fill in all fields"):
            signup_with_email_password(
                name="John Doe",
                username="johndoe",
                email="",
                password="password123"
            )


class TestSignIn:
    """Tests for user sign-in functionality"""
    
    @patch('accounts.signups.requests.post')
    @patch('accounts.signups.create_user_profile')
    @patch('accounts.signups._user_doc_ref')
    def test_login_valid_credentials(self, mock_user_doc_ref, mock_create_profile, mock_post):
        """Test 1: Valid login with correct email and password"""
        # Mock successful Firebase Auth response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "localId": "test_uid_123",
            "idToken": "test_id_token",
            "refreshToken": "test_refresh_token",
            "expiresIn": "3600"
        }
        mock_post.return_value = mock_response
        
        # Mock user profile exists
        mock_doc_ref = Mock()
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "name": "John Doe",
            "username": "johndoe"
        }
        mock_doc_ref.get.return_value = mock_doc
        mock_user_doc_ref.return_value = mock_doc_ref
        
        result = login_with_email_password("john@example.com", "password123")
        
        assert result["success"] is True
        assert result["uid"] == "test_uid_123"
        assert result["email"] == "john@example.com"
        assert result["idToken"] == "test_id_token"
    
    def test_login_empty_email(self):
        """Test 2: Login with empty email should fail"""
        with pytest.raises(ValueError, match="Please enter both email and password"):
            login_with_email_password("", "password123")
    
    def test_login_empty_password(self):
        """Test 3: Login with empty password should fail"""
        with pytest.raises(ValueError, match="Please enter both email and password"):
            login_with_email_password("john@example.com", "")
    
    @patch('accounts.signups.requests.post')
    def test_login_wrong_password(self, mock_post):
        """Test 4: Login with wrong password should fail"""
        # Mock failed Firebase Auth response
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.json.return_value = {
            "error": {
                "message": "INVALID_PASSWORD"
            }
        }
        mock_post.return_value = mock_response
        
        with pytest.raises(RuntimeError, match="Login failed: INVALID_PASSWORD"):
            login_with_email_password("john@example.com", "wrongpassword")
    
    @patch('accounts.signups.requests.post')
    def test_login_invalid_email_format(self, mock_post):
        """Test 5: Login with invalid email format should fail"""
        # Mock failed Firebase Auth response
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.json.return_value = {
            "error": {
                "message": "INVALID_EMAIL"
            }
        }
        mock_post.return_value = mock_response
        
        with pytest.raises(RuntimeError, match="Login failed: INVALID_EMAIL"):
            login_with_email_password("not-an-email", "password123")


class TestCreateEvent:
    """Tests for event creation functionality"""
    
    @patch('events.schedule.db')
    def test_create_event_valid_inputs(self, mock_db):
        """Test 1: Valid event creation with all correct inputs"""
        # Mock Firestore response
        mock_doc_ref = Mock()
        mock_doc_ref.id = "test_event_123"
        mock_db.collection.return_value.add.return_value = (None, mock_doc_ref)
        
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        result = create_hiking_event(
            title="Mountain Hike",
            location="Blue Ridge Trail",
            event_date=future_date,
            description="A beautiful mountain hike",
            max_attendees=15,
            difficulty_level="intermediate",
            organizer_uid="organizer_123"
        )
        
        assert result["success"] is True
        assert result["event_id"] == "test_event_123"
        assert result["title"] == "Mountain Hike"
        assert result["location"] == "Blue Ridge Trail"
        assert result["max_attendees"] == 15
        assert result["difficulty_level"] == "intermediate"
    
    def test_create_event_empty_title(self):
        """Test 2: Event creation with empty title should fail"""
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        with pytest.raises(ValueError, match="Title and location are required"):
            create_hiking_event(
                title="",
                location="Blue Ridge Trail",
                event_date=future_date
            )
    
    def test_create_event_past_date(self):
        """Test 3: Event creation with past date should fail"""
        past_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        with pytest.raises(ValueError, match="Event date must be in the future"):
            create_hiking_event(
                title="Mountain Hike",
                location="Blue Ridge Trail",
                event_date=past_date
            )
    
    def test_create_event_invalid_difficulty(self):
        """Test 4: Event creation with invalid difficulty level should fail"""
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        with pytest.raises(ValueError, match="Difficulty level must be: beginner, intermediate, or advanced"):
            create_hiking_event(
                title="Mountain Hike",
                location="Blue Ridge Trail",
                event_date=future_date,
                difficulty_level="expert"
            )
    
    def test_create_event_negative_attendees(self):
        """Test 5: Event creation with negative max attendees should fail"""
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        with pytest.raises(ValueError, match="Max attendees must be greater than 0"):
            create_hiking_event(
                title="Mountain Hike",
                location="Blue Ridge Trail",
                event_date=future_date,
                max_attendees=-5
            )


class TestDownloadMap:
    """Tests for map downloading functionality"""
    
    def test_validate_latitude_valid(self):
        """Test 1: Valid latitude should pass validation"""
        result = validate_latitude("37.3496")
        assert result == 37.3496
    
    def test_validate_latitude_too_high(self):
        """Test 2: Latitude above 90 should fail validation"""
        with pytest.raises(Exception, match="Latitude must be between -90 and 90"):
            validate_latitude("91")
    
    def test_validate_longitude_too_low(self):
        """Test 3: Longitude below -180 should fail validation"""
        with pytest.raises(Exception, match="Longitude must be between -180 and 180"):
            validate_longitude("-181")
    
    def test_validate_zoom_too_high(self):
        """Test 4: Zoom level above 18 should fail validation"""
        with pytest.raises(Exception, match="Zoom must be between 1 and 18"):
            validate_zoom("19")
    
    def test_validate_latitude_invalid_format(self):
        """Test 5: Invalid latitude format should fail validation"""
        with pytest.raises(Exception, match="Invalid latitude value"):
            validate_latitude("not_a_number")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
