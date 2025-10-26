# Firestore Setup Guide

## Firebase Configuration

To use Firestore with your TrailMix app, you need to:

1. **Enable Firestore in Firebase Console:**
   - Go to your Firebase project console
   - Navigate to "Firestore Database" in the left sidebar
   - Click "Create database"
   - Choose "Start in test mode" for development
   - Select a location for your database

2. **Update Security Rules (Optional for development):**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

## Features Added

### User Profile Management
- **Sign Up**: Creates a new user profile with name, username, email, and timestamps
- **Sign In**: Updates the last login timestamp for existing users
- **Profile Data**: Stores user information in Firestore collection `users`

### Data Structure
Each user document in the `users` collection contains:
```javascript
{
  uid: string,           // Firebase Auth UID
  email: string,         // User's email
  name: string,          // Full name
  username: string,      // Unique username
  createdAt: timestamp,  // Account creation time
  lastLoginAt: timestamp // Last login time
}
```

### API Functions
- `createUserProfile(user, additionalData)`: Creates or updates user profile
- `updateLastLogin(user)`: Updates last login timestamp
- `getUserProfile(uid)`: Retrieves user profile data

## Usage

The integration is automatic - no additional setup required in your app code. When users sign up or sign in, their profile data is automatically managed in Firestore.

## Testing

To test the integration:
1. Create a new account through the sign-up form
2. Check your Firestore console to see the new user document
3. Sign in with the same account to see the `lastLoginAt` timestamp update
