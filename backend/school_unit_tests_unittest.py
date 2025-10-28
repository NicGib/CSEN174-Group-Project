#!/usr/bin/env python3
"""
School Unit Tests for TrailMix Backend using unittest library

This module contains focused unit tests for the most critical functionality of the TrailMix backend.
Each test category (signup, signin, event creation, map validation) includes:
- 1 valid input test (happy path)
- 4 invalid input tests (error handling)
- 1 edge case test (boundary conditions)

Test Structure:
- TestSignUp: 6 tests for user registration functionality
- TestSignIn: 6 tests for user authentication functionality  
- TestCreateEvent: 6 tests for hiking event creation functionality
- TestDownloadMap: 6 tests for map coordinate validation functionality

Total: 24 tests covering the most important user workflows and error scenarios.

Usage:
    python school_unit_tests_unittest.py
    
Dependencies:
    - unittest (Python standard library)
    - unittest.mock (for mocking external dependencies; done to prevent actual Firebase calls, which gets pricey)
    - datetime (for date/time operations)
    - TrailMix backend modules (accounts, events, maps)
"""

import unittest
import sys
import os
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock

# Add the parent directory to the path so we can import from backend modules
# This allows us to import from accounts/, events/, and maps/ directories
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the modules we're testing
from accounts.signups import signup_with_email_password, login_with_email_password
from events.schedule import create_hiking_event
from maps.download_map import validate_latitude, validate_longitude, validate_zoom, fetch_osm_data


class TestSignUp(unittest.TestCase):
    """
    Test suite for user signup functionality.
    
    This class tests the complete user registration workflow including:
    - Valid signup scenarios
    - Input validation (empty fields, short passwords, etc.)
    - Username uniqueness checking
    - Edge cases (minimum password length)
    
    All tests use mocking to avoid actual Firebase calls during testing.
    """
    
    @patch('accounts.signups.auth')
    @patch('accounts.signups.create_user_profile')
    @patch('accounts.signups._is_username_taken')
    def test_signup_valid_inputs(self, mock_username_taken, mock_create_profile, mock_auth):
        """
        Test 1: Valid signup with all correct inputs (Happy Path)
        
        This test verifies that a user can successfully sign up when providing:
        - Valid name, username, email, and password
        - Username that is not already taken
        - All required fields filled
        
        Expected behavior:
        - Firebase Auth user is created successfully
        - User profile is stored in Firestore
        - Success response is returned with user details
        """
        # Mock username availability check - username is not taken
        mock_username_taken.return_value = False
        
        # Mock Firebase Auth user creation response
        mock_user_record = Mock()
        mock_user_record.uid = "test_uid_123"
        mock_user_record.email = "john@example.com"
        mock_auth.create_user.return_value = mock_user_record
        
        # Execute the signup function with valid inputs
        result = signup_with_email_password(
            name="John Doe",
            username="johndoe",
            email="john@example.com",
            password="password123"
        )
        
        # Verify the signup was successful and returned correct data
        self.assertTrue(result["success"])
        self.assertEqual(result["uid"], "test_uid_123")
        self.assertEqual(result["email"], "john@example.com")
        self.assertEqual(result["name"], "John Doe")
        self.assertEqual(result["username"], "johndoe")
    
    def test_signup_empty_name(self):
        """
        Test 2: Signup with empty name should fail (Input Validation)
        
        This test verifies that the signup function properly validates required fields
        and rejects attempts to sign up with an empty name field.
        
        Expected behavior:
        - ValueError should be raised
        - Error message should indicate "Please fill in all fields"
        """
        with self.assertRaises(ValueError) as context:
            signup_with_email_password(
                name="",  # Empty name should trigger validation error
                username="johndoe",
                email="john@example.com",
                password="password123"
            )
        self.assertIn("Please fill in all fields", str(context.exception))
    
    def test_signup_short_password(self):
        """
        Test 3: Signup with password too short should fail (Input Validation)
        
        This test verifies that the signup function enforces minimum password length
        requirements and rejects passwords that are too short.
        
        Expected behavior:
        - ValueError should be raised
        - Error message should indicate minimum password length requirement
        """
        with self.assertRaises(ValueError) as context:
            signup_with_email_password(
                name="John Doe",
                username="johndoe",
                email="john@example.com",
                password="123"  # Password too short (less than 6 characters)
            )
        self.assertIn("Password must be at least 6 characters long", str(context.exception))
    
    @patch('accounts.signups._is_username_taken')
    def test_signup_username_taken(self, mock_username_taken):
        """
        Test 4: Signup with taken username should fail (Business Logic Validation)
        
        This test verifies that the signup function checks for username uniqueness
        and prevents duplicate usernames from being created.
        
        Expected behavior:
        - ValueError should be raised
        - Error message should indicate username is already taken
        """
        # Mock that the username is already taken
        mock_username_taken.return_value = True
        
        with self.assertRaises(ValueError) as context:
            signup_with_email_password(
                name="John Doe",
                username="johndoe",  # This username is already taken
                email="john@example.com",
                password="password123"
            )
        self.assertIn("Username 'johndoe' is already taken", str(context.exception))
    
    def test_signup_empty_email(self):
        """
        Test 5: Signup with empty email should fail (Input Validation)
        
        This test verifies that the signup function properly validates required fields
        and rejects attempts to sign up with an empty email field.
        
        Expected behavior:
        - ValueError should be raised
        - Error message should indicate "Please fill in all fields"
        """
        with self.assertRaises(ValueError) as context:
            signup_with_email_password(
                name="John Doe",
                username="johndoe",
                email="",  # Empty email should trigger validation error
                password="password123"
            )
        self.assertIn("Please fill in all fields", str(context.exception))
    
    @patch('accounts.signups.auth')
    @patch('accounts.signups.create_user_profile')
    @patch('accounts.signups._is_username_taken')
    def test_signup_edge_case_minimum_password_length(self, mock_username_taken, mock_create_profile, mock_auth):
        """
        Test 6: Edge case - Signup with minimum valid password length (6 characters)
        
        This test verifies the boundary condition where a user provides exactly
        the minimum required password length. This is an important edge case
        because it tests the exact boundary between valid and invalid passwords.
        
        Expected behavior:
        - Signup should succeed with exactly 6-character password
        - All user data should be properly stored and returned
        - This validates the minimum password requirement is correctly implemented
        """
        # Mock username availability check - username is not taken
        mock_username_taken.return_value = False
        
        # Mock Firebase Auth user creation response
        mock_user_record = Mock()
        mock_user_record.uid = "test_uid_123"
        mock_user_record.email = "john@example.com"
        mock_auth.create_user.return_value = mock_user_record
        
        # Test with minimum valid password length (exactly 6 characters)
        min_password = "123456"  # Exactly 6 characters (minimum valid length)
        
        result = signup_with_email_password(
            name="John Doe",
            username="johndoe1",
            email="john@example.com",
            password=min_password
        )
        
        # Verify the signup was successful with minimum password length
        self.assertTrue(result["success"])
        self.assertEqual(result["uid"], "test_uid_123")
        self.assertEqual(result["email"], "john@example.com")
        self.assertEqual(result["name"], "John Doe")
        self.assertEqual(result["username"], "johndoe1")
        # Note: Password is not returned in the result for security reasons


class TestSignIn(unittest.TestCase):
    """
    Test suite for user sign-in functionality.
    
    This class tests the complete user authentication workflow including:
    - Valid login scenarios with correct credentials
    - Input validation (empty fields, invalid formats)
    - Authentication failures (wrong password, invalid email)
    - Edge cases (unicode characters in email)
    
    All tests use mocking to avoid actual Firebase API calls during testing.
    """
    
    @patch('accounts.signups.requests.post')
    @patch('accounts.signups.create_user_profile')
    @patch('accounts.signups._user_doc_ref')
    def test_login_valid_credentials(self, mock_user_doc_ref, mock_create_profile, mock_post):
        """
        Test 1: Valid login with correct email and password (Happy Path)
        
        This test verifies that a user can successfully log in when providing:
        - Valid email and password combination
        - Existing user profile in Firestore
        - Successful Firebase authentication
        
        Expected behavior:
        - Firebase authentication succeeds
        - User profile is retrieved and updated
        - Success response is returned with authentication tokens
        """
        # Mock successful Firebase Auth API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "localId": "test_uid_123",
            "idToken": "test_id_token",
            "refreshToken": "test_refresh_token",
            "expiresIn": "3600"
        }
        mock_post.return_value = mock_response
        
        # Mock user profile exists in Firestore
        mock_doc_ref = Mock()
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "name": "John Doe",
            "username": "johndoe"
        }
        mock_doc_ref.get.return_value = mock_doc
        mock_user_doc_ref.return_value = mock_doc_ref
        
        # Execute login with valid credentials
        result = login_with_email_password("john@example.com", "password123")
        
        # Verify login was successful and returned correct data
        self.assertTrue(result["success"])
        self.assertEqual(result["uid"], "test_uid_123")
        self.assertEqual(result["email"], "john@example.com")
        self.assertEqual(result["idToken"], "test_id_token")
    
    def test_login_empty_email(self):
        """
        Test 2: Login with empty email should fail (Input Validation)
        
        This test verifies that the login function properly validates required fields
        and rejects attempts to log in with an empty email field.
        
        Expected behavior:
        - ValueError should be raised
        - Error message should indicate both email and password are required
        """
        with self.assertRaises(ValueError) as context:
            login_with_email_password("", "password123")  # Empty email should trigger validation error
        self.assertIn("Please enter both email and password", str(context.exception))
    
    def test_login_empty_password(self):
        """
        Test 3: Login with empty password should fail (Input Validation)
        
        This test verifies that the login function properly validates required fields
        and rejects attempts to log in with an empty password field.
        
        Expected behavior:
        - ValueError should be raised
        - Error message should indicate both email and password are required
        """
        with self.assertRaises(ValueError) as context:
            login_with_email_password("john@example.com", "")  # Empty password should trigger validation error
        self.assertIn("Please enter both email and password", str(context.exception))
    
    @patch('accounts.signups.requests.post')
    def test_login_wrong_password(self, mock_post):
        """
        Test 4: Login with wrong password should fail (Authentication Failure)
        
        This test verifies that the login function properly handles authentication
        failures when an incorrect password is provided.
        
        Expected behavior:
        - RuntimeError should be raised
        - Error message should indicate invalid password
        """
        # Mock failed Firebase Auth API response
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.json.return_value = {
            "error": {
                "message": "INVALID_PASSWORD"
            }
        }
        mock_post.return_value = mock_response
        
        with self.assertRaises(RuntimeError) as context:
            login_with_email_password("john@example.com", "wrongpassword")  # Wrong password
        self.assertIn("Login failed: INVALID_PASSWORD", str(context.exception))
    
    @patch('accounts.signups.requests.post')
    def test_login_invalid_email_format(self, mock_post):
        """
        Test 5: Login with invalid email format should fail (Input Validation)
        
        This test verifies that the login function properly handles malformed email
        addresses and returns appropriate error messages.
        
        Expected behavior:
        - RuntimeError should be raised
        - Error message should indicate invalid email format
        """
        # Mock failed Firebase Auth API response
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.json.return_value = {
            "error": {
                "message": "INVALID_EMAIL"
            }
        }
        mock_post.return_value = mock_response
        
        with self.assertRaises(RuntimeError) as context:
            login_with_email_password("not-an-email", "password123")  # Invalid email format
        self.assertIn("Login failed: INVALID_EMAIL", str(context.exception))
    
    @patch('accounts.signups.requests.post')
    @patch('accounts.signups.create_user_profile')
    @patch('accounts.signups._user_doc_ref')
    def test_login_edge_case_unicode_email(self, mock_user_doc_ref, mock_create_profile, mock_post):
        """
        Test 6: Edge case - Login with unicode characters in email
        
        This test verifies that the login function properly handles international
        email addresses containing unicode characters (accented letters, special
        characters, etc.). This is important for international users.
        
        Expected behavior:
        - Login should succeed with unicode email address
        - User profile should be retrieved correctly
        - All unicode characters should be preserved
        """
        # Mock successful Firebase Auth API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "localId": "test_uid_123",
            "idToken": "test_id_token",
            "refreshToken": "test_refresh_token",
            "expiresIn": "3600"
        }
        mock_post.return_value = mock_response
        
        # Mock user profile exists in Firestore with unicode name
        mock_doc_ref = Mock()
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "name": "José García",
            "username": "josegarcia"
        }
        mock_doc_ref.get.return_value = mock_doc
        mock_user_doc_ref.return_value = mock_doc_ref
        
        # Test with unicode email containing accented characters
        unicode_email = "josé.garcía@example.com"
        result = login_with_email_password(unicode_email, "password123")
        
        # Verify login was successful with unicode email
        self.assertTrue(result["success"])
        self.assertEqual(result["email"], unicode_email)


class TestCreateEvent(unittest.TestCase):
    """
    Test suite for hiking event creation functionality.
    
    This class tests the complete event creation workflow including:
    - Valid event creation scenarios
    - Input validation (empty fields, invalid dates, etc.)
    - Business logic validation (difficulty levels, attendee limits)
    - Edge cases (maximum attendees)
    
    All tests use mocking to avoid actual Firestore database calls during testing.
    """
    
    @patch('events.schedule.db')
    def test_create_event_valid_inputs(self, mock_db):
        """
        Test 1: Valid event creation with all correct inputs (Happy Path)
        
        This test verifies that an event can be successfully created when providing:
        - Valid title, location, and description
        - Future event date
        - Valid difficulty level and attendee count
        - Valid organizer UID
        
        Expected behavior:
        - Event is stored in Firestore successfully
        - Success response is returned with event details
        - All event data is properly saved and returned
        """
        # Mock Firestore database response
        mock_doc_ref = Mock()
        mock_doc_ref.id = "test_event_123"
        mock_db.collection.return_value.add.return_value = (None, mock_doc_ref)
        
        # Create a future date for the event
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        # Execute event creation with valid inputs
        result = create_hiking_event(
            title="Mountain Hike",
            location="Blue Ridge Trail",
            event_date=future_date,
            description="A beautiful mountain hike",
            max_attendees=15,
            difficulty_level="intermediate",
            organizer_uid="organizer_123"
        )
        
        # Verify event was created successfully
        self.assertTrue(result["success"])
        self.assertEqual(result["event_id"], "test_event_123")
        self.assertEqual(result["title"], "Mountain Hike")
        self.assertEqual(result["location"], "Blue Ridge Trail")
        self.assertEqual(result["max_attendees"], 15)
        self.assertEqual(result["difficulty_level"], "intermediate")
    
    def test_create_event_empty_title(self):
        """
        Test 2: Event creation with empty title should fail (Input Validation)
        
        This test verifies that the event creation function properly validates
        required fields and rejects attempts to create events with empty titles.
        
        Expected behavior:
        - ValueError should be raised
        - Error message should indicate title and location are required
        """
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        with self.assertRaises(ValueError) as context:
            create_hiking_event(
                title="",  # Empty title should trigger validation error
                location="Blue Ridge Trail",
                event_date=future_date
            )
        self.assertIn("Title and location are required", str(context.exception))
    
    def test_create_event_past_date(self):
        """
        Test 3: Event creation with past date should fail (Business Logic Validation)
        
        This test verifies that the event creation function enforces the business
        rule that events must be scheduled for future dates only.
        
        Expected behavior:
        - ValueError should be raised
        - Error message should indicate event date must be in the future
        """
        past_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        with self.assertRaises(ValueError) as context:
            create_hiking_event(
                title="Mountain Hike",
                location="Blue Ridge Trail",
                event_date=past_date  # Past date should trigger validation error
            )
        self.assertIn("Event date must be in the future", str(context.exception))
    
    def test_create_event_invalid_difficulty(self):
        """
        Test 4: Event creation with invalid difficulty level should fail (Input Validation)
        
        This test verifies that the event creation function validates difficulty
        levels and only accepts predefined valid values.
        
        Expected behavior:
        - ValueError should be raised
        - Error message should indicate valid difficulty levels
        """
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        with self.assertRaises(ValueError) as context:
            create_hiking_event(
                title="Mountain Hike",
                location="Blue Ridge Trail",
                event_date=future_date,
                difficulty_level="expert"  # Invalid difficulty level
            )
        self.assertIn("Difficulty level must be: beginner, intermediate, or advanced", str(context.exception))
    
    def test_create_event_negative_attendees(self):
        """
        Test 5: Event creation with negative max attendees should fail (Input Validation)
        
        This test verifies that the event creation function validates attendee
        counts and rejects negative values which don't make business sense.
        
        Expected behavior:
        - ValueError should be raised
        - Error message should indicate max attendees must be greater than 0
        """
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        with self.assertRaises(ValueError) as context:
            create_hiking_event(
                title="Mountain Hike",
                location="Blue Ridge Trail",
                event_date=future_date,
                max_attendees=-5  # Negative attendee count should trigger validation error
            )
        self.assertIn("Max attendees must be greater than 0", str(context.exception))
    
    @patch('events.schedule.db')
    def test_create_event_edge_case_maximum_attendees(self, mock_db):
        """
        Test 6: Edge case - Event creation with maximum possible attendees (1000)
        
        This test verifies the boundary condition where an event is created with
        a very large number of attendees. This tests the system's ability to handle
        large-scale events and validates that there are no artificial limits
        preventing legitimate large group events.
        
        Expected behavior:
        - Event should be created successfully with 1000 attendees
        - All event data should be properly stored and returned
        - This validates the system can handle large group events
        """
        # Mock Firestore database response
        mock_doc_ref = Mock()
        mock_doc_ref.id = "test_event_123"
        mock_db.collection.return_value.add.return_value = (None, mock_doc_ref)
        
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        # Execute event creation with maximum attendees
        result = create_hiking_event(
            title="Massive Group Hike",
            location="National Park Trail",
            event_date=future_date,
            description="A large group hiking event",
            max_attendees=1000,  # Very large number - edge case
            difficulty_level="beginner",
            organizer_uid="organizer_123"
        )
        
        # Verify event was created successfully with large attendee count
        self.assertTrue(result["success"])
        self.assertEqual(result["max_attendees"], 1000)
        self.assertEqual(result["title"], "Massive Group Hike")


class TestDownloadMap(unittest.TestCase):
    """
    Test suite for map coordinate validation functionality.
    
    This class tests the coordinate validation functions used in map downloading
    including latitude, longitude, and zoom level validation. These functions
    are critical for ensuring map requests use valid geographic coordinates.
    
    Test coverage includes:
    - Valid coordinate scenarios
    - Boundary value testing (exact limits)
    - Invalid input validation (out of range, wrong format)
    - Edge cases (boundary conditions)
    """
    
    def test_validate_latitude_valid(self):
        """
        Test 1: Valid latitude should pass validation (Happy Path)
        
        This test verifies that a valid latitude coordinate within the acceptable
        range (-90 to 90 degrees) is properly validated and returned.
        
        Expected behavior:
        - Latitude should be parsed and returned as float
        - No exceptions should be raised
        """
        result = validate_latitude("37.3496")
        self.assertEqual(result, 37.3496)
    
    def test_validate_latitude_too_high(self):
        """
        Test 2: Latitude above 90 should fail validation (Input Validation)
        
        This test verifies that latitudes above the maximum valid value (90 degrees)
        are properly rejected with appropriate error messages.
        
        Expected behavior:
        - Exception should be raised
        - Error message should indicate latitude range limits
        """
        with self.assertRaises(Exception) as context:
            validate_latitude("91")  # Above maximum valid latitude
        self.assertIn("Latitude must be between -90 and 90", str(context.exception))
    
    def test_validate_longitude_too_low(self):
        """
        Test 3: Longitude below -180 should fail validation (Input Validation)
        
        This test verifies that longitudes below the minimum valid value (-180 degrees)
        are properly rejected with appropriate error messages.
        
        Expected behavior:
        - Exception should be raised
        - Error message should indicate longitude range limits
        """
        with self.assertRaises(Exception) as context:
            validate_longitude("-181")  # Below minimum valid longitude
        self.assertIn("Longitude must be between -180 and 180", str(context.exception))
    
    def test_validate_zoom_too_high(self):
        """
        Test 4: Zoom level above 18 should fail validation (Input Validation)
        
        This test verifies that zoom levels above the maximum valid value (18)
        are properly rejected with appropriate error messages.
        
        Expected behavior:
        - Exception should be raised
        - Error message should indicate zoom level range limits
        """
        with self.assertRaises(Exception) as context:
            validate_zoom("19")  # Above maximum valid zoom level
        self.assertIn("Zoom must be between 1 and 18", str(context.exception))
    
    def test_validate_latitude_invalid_format(self):
        """
        Test 5: Invalid latitude format should fail validation (Input Validation)
        
        This test verifies that non-numeric latitude values are properly rejected
        with appropriate error messages.
        
        Expected behavior:
        - Exception should be raised
        - Error message should indicate invalid latitude value
        """
        with self.assertRaises(Exception) as context:
            validate_latitude("not_a_number")  # Non-numeric input
        self.assertIn("Invalid latitude value", str(context.exception))
    
    def test_validate_latitude_edge_case_boundary_values(self):
        """
        Test 6: Edge case - Testing exact boundary values for latitude
        
        This test verifies the exact boundary conditions for latitude validation.
        It tests values at the exact limits and just outside them to ensure
        proper boundary handling.
        
        Expected behavior:
        - Exact boundary values (90, -90, 0) should be valid
        - Values just outside boundaries should be invalid
        """
        # Test exact boundary values - these should be valid
        self.assertEqual(validate_latitude("90"), 90.0)  # Maximum valid latitude
        self.assertEqual(validate_latitude("-90"), -90.0)  # Minimum valid latitude
        self.assertEqual(validate_latitude("0"), 0.0)  # Equator
        
        # Test values just outside boundaries - these should be invalid
        with self.assertRaises(Exception):
            validate_latitude("90.0001")  # Just above maximum
        
        with self.assertRaises(Exception):
            validate_latitude("-90.0001")  # Just below minimum


if __name__ == "__main__":
    """
    Test Runner and Execution
    
    This section sets up and runs all the unit tests with a custom result handler
    that provides detailed output including individual test results and summary statistics.
    
    Features:
    - Custom test result class for detailed reporting
    - Individual test status display (PASSED/FAILED/ERROR)
    - Comprehensive test summary with statistics
    - Detailed error reporting for failed tests
    """
    
    # Create a test suite to organize all tests
    test_suite = unittest.TestSuite()
    
    # Define all test classes to be executed
    test_classes = [TestSignUp, TestSignIn, TestCreateEvent, TestDownloadMap]
    
    # Load tests from each test class and add to the suite
    for test_class in test_classes:
        tests = unittest.TestLoader().loadTestsFromTestCase(test_class)
        test_suite.addTests(tests)
    
    # Custom test result class to capture individual test results
    class CustomTestResult(unittest.TextTestResult):
        """
        Custom test result handler that captures individual test results
        for detailed reporting and analysis.
        """
        def __init__(self, stream, descriptions, verbosity):
            super().__init__(stream, descriptions, verbosity)
            self.test_results = []  # Store individual test results
        
        def addSuccess(self, test):
            """Record a successful test execution"""
            super().addSuccess(test)
            self.test_results.append((test, "PASSED"))
        
        def addError(self, test, err):
            """Record a test that raised an unexpected exception"""
            super().addError(test, err)
            self.test_results.append((test, "ERROR"))
        
        def addFailure(self, test, err):
            """Record a test that failed an assertion"""
            super().addFailure(test, err)
            self.test_results.append((test, "FAILED"))
    
    # Execute all tests with custom result handler
    runner = unittest.TextTestRunner(verbosity=0, resultclass=CustomTestResult)
    result = runner.run(test_suite)
    
    # Display individual test results in a formatted table
    print(f"\n{'='*80}")
    print("INDIVIDUAL TEST RESULTS:")
    print(f"{'='*80}")
    
    for test, status in result.test_results:
        test_name = f"{test.__class__.__name__}.{test._testMethodName}"
        print(f"{test_name:<73} {status}")
    
    # Display comprehensive test summary
    print(f"\n{'='*80}")
    print("TEST SUMMARY:")
    print(f"{'='*80}")
    print(f"Total Tests: {result.testsRun}")
    print(f"Passed: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failed: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Success Rate: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%")
    print(f"{'='*80}")
    
    # Display detailed failure/error information if any tests failed
    if result.failures or result.errors:
        print(f"\n{'='*80}")
        print("DETAILED FAILURE/ERROR INFORMATION:")
        print(f"{'='*80}")
        
        for test, traceback in result.failures + result.errors:
            test_name = f"{test.__class__.__name__}.{test._testMethodName}"
            print(f"\n{test_name}:")
            print("-" * 60)
            print(traceback)
            print("-" * 60)
