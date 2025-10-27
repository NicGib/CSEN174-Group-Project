#!/usr/bin/env python3
"""
Comprehensive unit tests for the authentication functionality
Tests signup, login, and user profile management functions
"""

import pytest
import sys
import os
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock
import json

# Add the parent directory to the path so we can import from accounts
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from accounts.signups import (
    signup_with_email_password,
    login_with_email_password,
    get_user_profile,
    create_user_profile,
    _is_username_taken,
    _user_doc_ref
)


class TestUsernameValidation:
    """Test username validation functionality"""
    
    @patch('accounts.signups.db')
    def test_is_username_taken_true(self, mock_db):
        """Test when username is already taken"""
        # Mock Firestore query to return existing user
        mock_query = Mock()
        mock_query.limit.return_value.get.return_value = [Mock()]  # Non-empty list
        mock_db.collection.return_value.where.return_value = mock_query
        
        result = _is_username_taken("existinguser")
        
        assert result is True
        mock_db.collection.assert_called_with("users")
        mock_query.where.assert_called_with("username", "==", "existinguser")
    
    @patch('accounts.signups.db')
    def test_is_username_taken_false(self, mock_db):
        """Test when username is available"""
        # Mock Firestore query to return empty list
        mock_query = Mock()
        mock_query.limit.return_value.get.return_value = []  # Empty list
        mock_db.collection.return_value.where.return_value = mock_query
        
        result = _is_username_taken("newuser")
        
        assert result is False
    
    def test_is_username_taken_strips_whitespace(self, mock_db):
        """Test that username is stripped of whitespace"""
        with patch('accounts.signups.db') as mock_db:
            mock_query = Mock()
            mock_query.limit.return_value.get.return_value = []
            mock_db.collection.return_value.where.return_value = mock_query
            
            _is_username_taken("  testuser  ")
            
            mock_query.where.assert_called_with("username", "==", "testuser")


class TestCreateUserProfile:
    """Test the create_user_profile function"""
    
    @patch('accounts.signups.db')
    def test_create_new_user_profile(self, mock_db):
        """Test creating a new user profile"""
        mock_doc_ref = Mock()
        mock_doc_snap = Mock()
        mock_doc_snap.exists = False
        mock_doc_ref.get.return_value = mock_doc_snap
        mock_db.collection.return_value.document.return_value = mock_doc_ref
        
        create_user_profile(
            uid="test_uid_123",
            name="Test User",
            username="testuser",
            email="test@example.com"
        )
        
        # Verify set was called with correct data
        mock_doc_ref.set.assert_called_once()
        call_args = mock_doc_ref.set.call_args[0][0]
        
        assert call_args["uid"] == "test_uid_123"
        assert call_args["name"] == "Test User"
        assert call_args["username"] == "testuser"
        assert call_args["email"] == "test@example.com"
        assert call_args["isActive"] is True
        assert call_args["totalHikes"] == 0
        assert call_args["totalDistance"] == 0
        assert call_args["achievements"] == []
        assert call_args["favoriteTrails"] == []
        assert call_args["hikingLevel"] == "beginner"
        assert call_args["bio"] == ""
        assert call_args["profilePicture"] == ""
    
    @patch('accounts.signups.db')
    def test_update_existing_user_profile(self, mock_db):
        """Test updating an existing user profile"""
        mock_doc_ref = Mock()
        mock_doc_snap = Mock()
        mock_doc_snap.exists = True
        mock_doc_ref.get.return_value = mock_doc_snap
        mock_db.collection.return_value.document.return_value = mock_doc_ref
        
        create_user_profile(
            uid="existing_uid_123",
            name="Existing User",
            username="existinguser",
            email="existing@example.com"
        )
        
        # Verify update was called
        mock_doc_ref.update.assert_called_once()
        call_args = mock_doc_ref.update.call_args[0][0]
        
        assert "lastLoginAt" in call_args
        assert call_args["isActive"] is True


class TestSignupWithEmailPassword:
    """Test the signup_with_email_password function"""
    
    @patch('accounts.signups.auth')
    @patch('accounts.signups.create_user_profile')
    @patch('accounts.signups._is_username_taken')
    def test_signup_success(self, mock_username_taken, mock_create_profile, mock_auth):
        """Test successful user signup"""
        # Mock username not taken
        mock_username_taken.return_value = False
        
        # Mock Firebase Auth user creation
        mock_user_record = Mock()
        mock_user_record.uid = "test_uid_123"
        mock_user_record.email = "test@example.com"
        mock_auth.create_user.return_value = mock_user_record
        
        result = signup_with_email_password(
            name="Test User",
            username="testuser",
            email="test@example.com",
            password="password123"
        )
        
        assert result["success"] is True
        assert result["uid"] == "test_uid_123"
        assert result["email"] == "test@example.com"
        assert result["name"] == "Test User"
        assert result["username"] == "testuser"
        assert "message" in result
        assert "timestamp" in result
        
        # Verify Firebase Auth user was created
        mock_auth.create_user.assert_called_once_with(
            email="test@example.com",
            password="password123",
            display_name="Test User"
        )
        
        # Verify profile was created
        mock_create_profile.assert_called_once_with(
            uid="test_uid_123",
            name="Test User",
            username="testuser",
            email="test@example.com"
        )
    
    def test_signup_validation_empty_fields(self):
        """Test signup validation for empty fields"""
        with pytest.raises(ValueError, match="Please fill in all fields"):
            signup_with_email_password("", "testuser", "test@example.com", "password123")
        
        with pytest.raises(ValueError, match="Please fill in all fields"):
            signup_with_email_password("Test User", "", "test@example.com", "password123")
        
        with pytest.raises(ValueError, match="Please fill in all fields"):
            signup_with_email_password("Test User", "testuser", "", "password123")
        
        with pytest.raises(ValueError, match="Please fill in all fields"):
            signup_with_email_password("Test User", "testuser", "test@example.com", "")
    
    def test_signup_validation_short_password(self):
        """Test signup validation for short password"""
        with pytest.raises(ValueError, match="Password must be at least 6 characters long"):
            signup_with_email_password("Test User", "testuser", "test@example.com", "123")
    
    @patch('accounts.signups._is_username_taken')
    def test_signup_validation_username_taken(self, mock_username_taken):
        """Test signup validation for taken username"""
        mock_username_taken.return_value = True
        
        with pytest.raises(ValueError, match="Username 'testuser' is already taken"):
            signup_with_email_password("Test User", "testuser", "test@example.com", "password123")
    
    @patch('accounts.signups.auth')
    @patch('accounts.signups._is_username_taken')
    def test_signup_firebase_auth_failure(self, mock_username_taken, mock_auth):
        """Test signup when Firebase Auth creation fails"""
        mock_username_taken.return_value = False
        mock_auth.create_user.side_effect = Exception("Firebase Auth error")
        
        with pytest.raises(RuntimeError, match="Signup failed: Firebase Auth error"):
            signup_with_email_password("Test User", "testuser", "test@example.com", "password123")
    
    @patch('accounts.signups.auth')
    @patch('accounts.signups.create_user_profile')
    @patch('accounts.signups._is_username_taken')
    def test_signup_profile_creation_failure(self, mock_username_taken, mock_create_profile, mock_auth):
        """Test signup when profile creation fails (should clean up auth user)"""
        mock_username_taken.return_value = False
        
        # Mock Firebase Auth user creation
        mock_user_record = Mock()
        mock_user_record.uid = "test_uid_123"
        mock_auth.create_user.return_value = mock_user_record
        
        # Mock profile creation failure
        mock_create_profile.side_effect = Exception("Profile creation error")
        
        with pytest.raises(RuntimeError, match="Profile creation failed \\(user rolled back\\): Profile creation error"):
            signup_with_email_password("Test User", "testuser", "test@example.com", "password123")
        
        # Verify auth user was deleted
        mock_auth.delete_user.assert_called_once_with("test_uid_123")


class TestLoginWithEmailPassword:
    """Test the login_with_email_password function"""
    
    @patch('accounts.signups.requests.post')
    @patch('accounts.signups.create_user_profile')
    @patch('accounts.signups._user_doc_ref')
    def test_login_success(self, mock_user_doc_ref, mock_create_profile, mock_post):
        """Test successful user login"""
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
            "name": "Test User",
            "username": "testuser"
        }
        mock_doc_ref.get.return_value = mock_doc
        mock_user_doc_ref.return_value = mock_doc_ref
        
        result = login_with_email_password("test@example.com", "password123")
        
        assert result["success"] is True
        assert result["uid"] == "test_uid_123"
        assert result["email"] == "test@example.com"
        assert result["idToken"] == "test_id_token"
        assert result["refreshToken"] == "test_refresh_token"
        assert result["expiresInSeconds"] == 3600
        assert "message" in result
        assert "timestamp" in result
        
        # Verify profile was updated
        mock_create_profile.assert_called_once_with(
            uid="test_uid_123",
            name="Test User",
            username="testuser",
            email="test@example.com"
        )
    
    def test_login_validation_empty_fields(self):
        """Test login validation for empty fields"""
        with pytest.raises(ValueError, match="Please enter both email and password"):
            login_with_email_password("", "password123")
        
        with pytest.raises(ValueError, match="Please enter both email and password"):
            login_with_email_password("test@example.com", "")
    
    @patch('accounts.signups.requests.post')
    def test_login_authentication_failure(self, mock_post):
        """Test login when authentication fails"""
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
            login_with_email_password("test@example.com", "wrongpassword")
    
    @patch('accounts.signups.requests.post')
    def test_login_network_error(self, mock_post):
        """Test login when network error occurs"""
        mock_post.side_effect = Exception("Network error")
        
        with pytest.raises(RuntimeError, match="Login failed: Network error - Network error"):
            login_with_email_password("test@example.com", "password123")
    
    @patch('accounts.signups.requests.post')
    @patch('accounts.signups.create_user_profile')
    @patch('accounts.signups._user_doc_ref')
    def test_login_profile_not_found(self, mock_user_doc_ref, mock_create_profile, mock_post):
        """Test login when user profile doesn't exist in Firestore"""
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
        
        # Mock user profile doesn't exist
        mock_doc_ref = Mock()
        mock_doc = Mock()
        mock_doc.exists = False
        mock_doc_ref.get.return_value = mock_doc
        mock_user_doc_ref.return_value = mock_doc_ref
        
        result = login_with_email_password("test@example.com", "password123")
        
        assert result["success"] is True
        
        # Verify basic profile was created
        mock_create_profile.assert_called_once_with(
            uid="test_uid_123",
            name="Unknown User",
            username="user_test_uid",
            email="test@example.com"
        )


class TestGetUserProfile:
    """Test the get_user_profile function"""
    
    @patch('accounts.signups._user_doc_ref')
    def test_get_user_profile_success(self, mock_user_doc_ref):
        """Test successful user profile retrieval"""
        mock_doc_ref = Mock()
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "uid": "test_uid_123",
            "name": "Test User",
            "username": "testuser",
            "email": "test@example.com",
            "totalHikes": 5,
            "hikingLevel": "intermediate"
        }
        mock_doc_ref.get.return_value = mock_doc
        mock_user_doc_ref.return_value = mock_doc_ref
        
        result = get_user_profile("test_uid_123")
        
        assert result is not None
        assert result["uid"] == "test_uid_123"
        assert result["name"] == "Test User"
        assert result["username"] == "testuser"
        assert result["email"] == "test@example.com"
        assert result["totalHikes"] == 5
        assert result["hikingLevel"] == "intermediate"
    
    @patch('accounts.signups._user_doc_ref')
    def test_get_user_profile_not_found(self, mock_user_doc_ref):
        """Test user profile retrieval when user doesn't exist"""
        mock_doc_ref = Mock()
        mock_doc = Mock()
        mock_doc.exists = False
        mock_doc_ref.get.return_value = mock_doc
        mock_user_doc_ref.return_value = mock_doc_ref
        
        result = get_user_profile("nonexistent_uid")
        
        assert result is None
    
    @patch('accounts.signups._user_doc_ref')
    def test_get_user_profile_error(self, mock_user_doc_ref):
        """Test user profile retrieval when error occurs"""
        mock_user_doc_ref.side_effect = Exception("Database error")
        
        result = get_user_profile("test_uid_123")
        
        assert result is None


class TestIntegrationScenarios:
    """Test integration scenarios and edge cases"""
    
    @patch('accounts.signups.auth')
    @patch('accounts.signups.create_user_profile')
    @patch('accounts.signups._is_username_taken')
    def test_complete_signup_flow(self, mock_username_taken, mock_create_profile, mock_auth):
        """Test complete signup flow with all validations"""
        # Mock username not taken
        mock_username_taken.return_value = False
        
        # Mock Firebase Auth user creation
        mock_user_record = Mock()
        mock_user_record.uid = "integration_uid_123"
        mock_user_record.email = "integration@example.com"
        mock_auth.create_user.return_value = mock_user_record
        
        result = signup_with_email_password(
            name="Integration Test User",
            username="integrationuser",
            email="integration@example.com",
            password="integration123"
        )
        
        assert result["success"] is True
        assert result["uid"] == "integration_uid_123"
        assert result["email"] == "integration@example.com"
        assert result["name"] == "Integration Test User"
        assert result["username"] == "integrationuser"
    
    @patch('accounts.signups.requests.post')
    @patch('accounts.signups.create_user_profile')
    @patch('accounts.signups._user_doc_ref')
    def test_complete_login_flow(self, mock_user_doc_ref, mock_create_profile, mock_post):
        """Test complete login flow"""
        # Mock successful Firebase Auth response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "localId": "login_uid_123",
            "idToken": "login_id_token",
            "refreshToken": "login_refresh_token",
            "expiresIn": "3600"
        }
        mock_post.return_value = mock_response
        
        # Mock user profile exists
        mock_doc_ref = Mock()
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "name": "Login Test User",
            "username": "logintestuser"
        }
        mock_doc_ref.get.return_value = mock_doc
        mock_user_doc_ref.return_value = mock_doc_ref
        
        result = login_with_email_password("logintest@example.com", "login123")
        
        assert result["success"] is True
        assert result["uid"] == "login_uid_123"
        assert result["email"] == "logintest@example.com"
        assert result["idToken"] == "login_id_token"
        assert result["refreshToken"] == "login_refresh_token"
        assert result["expiresInSeconds"] == 3600


class TestDataValidation:
    """Test data validation and sanitization"""
    
    def test_email_normalization(self):
        """Test that emails are normalized to lowercase"""
        with patch('accounts.signups.auth') as mock_auth, \
             patch('accounts.signups.create_user_profile') as mock_create_profile, \
             patch('accounts.signups._is_username_taken') as mock_username_taken:
            
            mock_username_taken.return_value = False
            mock_user_record = Mock()
            mock_user_record.uid = "test_uid"
            mock_user_record.email = "TEST@EXAMPLE.COM"
            mock_auth.create_user.return_value = mock_user_record
            
            signup_with_email_password("Test User", "testuser", "TEST@EXAMPLE.COM", "password123")
            
            # Verify email was normalized
            mock_auth.create_user.assert_called_once_with(
                email="test@example.com",
                password="password123",
                display_name="Test User"
            )
    
    def test_username_normalization(self):
        """Test that usernames are normalized to lowercase"""
        with patch('accounts.signups.auth') as mock_auth, \
             patch('accounts.signups.create_user_profile') as mock_create_profile, \
             patch('accounts.signups._is_username_taken') as mock_username_taken:
            
            mock_username_taken.return_value = False
            mock_user_record = Mock()
            mock_user_record.uid = "test_uid"
            mock_user_record.email = "test@example.com"
            mock_auth.create_user.return_value = mock_user_record
            
            signup_with_email_password("Test User", "TESTUSER", "test@example.com", "password123")
            
            # Verify username was normalized in profile creation
            mock_create_profile.assert_called_once()
            call_args = mock_create_profile.call_args[1]
            assert call_args["username"] == "testuser"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
