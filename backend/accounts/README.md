# TrailMix Backend Authentication System

This backend authentication system mirrors the frontend functionality and provides comprehensive user management for the TrailMix hiking app.

## 🚀 Features

- **User Registration**: Create new users with Firebase Auth + Firestore profiles
- **User Login**: Authenticate users and update last login timestamps
- **Profile Management**: Comprehensive user profiles with hiking data
- **Error Handling**: Robust validation and error management
- **Interactive Testing**: CLI interface for testing functionality

## 📁 Files

- `singups.py` - Main authentication module
- `test_auth.py` - Test suite for authentication functionality
- `README.md` - This documentation

## 🛠️ Setup

### Prerequisites

1. **Firebase Project**: Ensure you have a Firebase project set up
2. **Service Account Key**: Download `serviceAccountKey.json` from Firebase Console
3. **Python Dependencies**: Install required packages

```bash
pip install firebase-admin requests
```

### Configuration

1. Place your `serviceAccountKey.json` in the `backend/accounts/` directory
2. Update the `FIREBASE_WEB_API_KEY` in `singups.py` with your Firebase Web API key
3. Ensure your Firebase project has Authentication and Firestore enabled

## 🎯 Usage

### Interactive Mode

Run the interactive CLI for testing:

```bash
cd backend/accounts
python singups.py
```

This will start an interactive menu where you can:
1. Sign up new users
2. Login existing users
3. Get user profiles
4. List all users
5. Exit

### Programmatic Usage

```python
from accounts.singups import signup_with_email_password, login_with_email_password

# Sign up a new user
result = signup_with_email_password(
    name="John Hiker",
    username="johnhiker", 
    email="john@example.com",
    password="hiking123"
)

# Login existing user
login_result = login_with_email_password(
    email="john@example.com",
    password="hiking123"
)
```

### Test Suite

Run the comprehensive test suite:

```bash
cd backend
python test_auth.py
```

## 📊 User Profile Structure

Each user profile in Firestore contains:

```json
{
  "uid": "user123",
  "name": "John Hiker",
  "username": "johnhiker",
  "email": "john@example.com",
  "createdAt": "2024-01-01T00:00:00Z",
  "lastLoginAt": "2024-01-01T12:00:00Z",
  "isActive": true,
  "totalHikes": 0,
  "totalDistance": 0,
  "achievements": [],
  "favoriteTrails": [],
  "hikingLevel": "beginner",
  "bio": "",
  "profilePicture": ""
}
```

## 🔧 API Functions

### `signup_with_email_password(name, username, email, password)`

Creates a new user account with Firebase Auth and Firestore profile.

**Parameters:**
- `name` (str): User's full name
- `username` (str): Unique username
- `email` (str): User's email address
- `password` (str): User's password (min 6 characters)

**Returns:**
- Dictionary with user data and success status

**Raises:**
- `ValueError`: For validation errors
- `RuntimeError`: For Firebase/Auth errors

### `login_with_email_password(email, password)`

Authenticates a user and updates their last login time.

**Parameters:**
- `email` (str): User's email address
- `password` (str): User's password

**Returns:**
- Dictionary with authentication tokens and user data

**Raises:**
- `ValueError`: For validation errors
- `RuntimeError`: For authentication errors

### `get_user_profile(uid)`

Retrieves a user's profile from Firestore.

**Parameters:**
- `uid` (str): User's unique identifier

**Returns:**
- Dictionary with user profile data or None if not found

### `list_all_users()`

Lists all users in the Firestore database (for testing/admin purposes).

## 🛡️ Security Features

- **Password Validation**: Minimum 6 characters required
- **Username Uniqueness**: Prevents duplicate usernames
- **Email Validation**: Firebase handles email format validation
- **Error Handling**: Comprehensive error catching and reporting
- **Cleanup**: Automatic cleanup of failed user creations

## 🧪 Testing

The system includes comprehensive testing:

1. **Functional Tests**: Signup, login, profile retrieval
2. **Error Handling Tests**: Invalid inputs, duplicate usernames, wrong passwords
3. **Integration Tests**: Firebase Auth + Firestore integration
4. **Interactive Testing**: CLI interface for manual testing

## 🔄 Frontend-Backend Parity

This backend system mirrors the frontend authentication exactly:

- Same validation rules
- Same error messages
- Same data structures
- Same user experience flow

## 🚨 Error Codes

Common error scenarios:

- `"Please fill in all fields"` - Missing required fields
- `"Password must be at least 6 characters long"` - Password too short
- `"Username 'X' is already taken"` - Duplicate username
- `"Login failed: INVALID_PASSWORD"` - Wrong password
- `"Login failed: EMAIL_NOT_FOUND"` - User doesn't exist

## 📝 Notes

- All timestamps use Firestore server timestamps
- Usernames are automatically converted to lowercase
- Email addresses are automatically converted to lowercase
- Failed user creations are automatically cleaned up
- The system is designed for testing and development use
