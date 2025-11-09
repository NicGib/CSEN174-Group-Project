import time
import requests
import firebase_admin
from firebase_admin import credentials, auth, firestore
from datetime import datetime
import json
import os
import unicodedata
from dotenv import load_dotenv

# Load environment variables
# Look for .env file in the secrets directory
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'secrets', '.env')
load_dotenv(env_path)

# ─────────────────────────
# 1. Firebase initialization
# ─────────────────────────
SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'secrets', "serviceAccountKey.json")
FIREBASE_WEB_API_KEY = os.getenv("FIREBASE_API_KEY")

# Validate environment variables
if not FIREBASE_WEB_API_KEY:
    raise ValueError("FIREBASE_API_KEY not found in environment variables. Please check your .env file.")

if not os.path.exists(SERVICE_ACCOUNT_PATH):
    raise FileNotFoundError(f"Service account key file not found: {SERVICE_ACCOUNT_PATH}. Please download it from Firebase Console.")

if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# ─────────────────────────
# 2. Helpers
# ─────────────────────────
def _now_ms() -> int:
    return int(time.time() * 1000)

def _normalize_username(username: str) -> str:
    """
    Normalizes a username by:
    1. Stripping whitespace
    2. Converting to lowercase
    3. Normalizing Unicode characters (handles different encodings of the same character)
    
    This prevents issues where visually identical usernames with different Unicode
    encodings (like "josé" vs "josé") are treated as different usernames.
    """
    return unicodedata.normalize('NFC', username.strip().lower())

def _user_doc_ref(uid: str):
    return db.collection("users").document(uid)

def _is_username_taken(username: str) -> bool:
    """
    Checks if a given username already exists in Firestore.
    Returns True if taken, False if available.
    
    Uses Unicode normalization to handle different encodings of the same character.
    """
    normalized_username = _normalize_username(username)
    existing = db.collection("users").where("username", "==", normalized_username).limit(1).get()
    return len(existing) > 0

def create_user_profile(uid: str, name: str, username: str, email: str):
    """
    Creates or updates user profile in Firestore.
    If user doesn't exist, creates new profile.
    If user exists, updates lastLogin timestamp.
    """
    doc_ref = _user_doc_ref(uid)
    snap = doc_ref.get()

    if not snap.exists:
        # Create new user profile with comprehensive data
        doc_ref.set({
            "uid": uid,
            "name": name.strip(),
            "username": _normalize_username(username),
            "email": email.strip().lower(),
            "createdAt": firestore.SERVER_TIMESTAMP,
            "lastLoginAt": firestore.SERVER_TIMESTAMP,
            "isActive": True,
            "status": "user",  # Default status
            "totalHikes": 0,
            "totalDistance": 0,
            "achievements": [],
            "favoriteTrails": [],
            "hikingLevel": "beginner",
            "bio": "",
            "profilePicture": "",
            "interests": [],
            "profileDescription": "",
            "gender": None,
            "preferredName": None,
            "birthday": None
        })
        print(f"New user profile created for {name} ({username})")
    else:
        # Update existing user's last login
        doc_ref.update({
            "lastLoginAt": firestore.SERVER_TIMESTAMP,
            "isActive": True
        })
        print(f"Last login updated for existing user {name} ({username})")

# ─────────────────────────
# 3. SIGN UP FLOW
# ─────────────────────────
def signup_with_email_password(name: str, username: str, email: str, password: str):
    """
    Backend version of frontend signup functionality.
    Creates Firebase Auth user and Firestore profile.
    """
    print(f"\nStarting signup process for {name} ({email})")
    
    # Validation (matching frontend validation)
    if not name.strip() or not username.strip() or not email.strip() or not password:
        raise ValueError("Please fill in all fields")
    
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters long")
    
    # Check if username already exists
    if _is_username_taken(username):
        raise ValueError(f"Username '{username}' is already taken. Please choose another one.")

    try:
        print("Creating Firebase Auth user...")
        user_record = auth.create_user(
            email=email.strip().lower(),
            password=password,
            display_name=name.strip(),
        )
        print(f"Firebase Auth user created: {user_record.uid}")
    except Exception as e:
        print(f"Firebase Auth creation failed: {e}")
        raise RuntimeError(f"Signup failed: {e}")

    uid = user_record.uid

    try:
        print("Creating Firestore user profile...")
        create_user_profile(
            uid=uid,
            name=name,
            username=username,
            email=email,
        )
        print("Firestore profile created successfully")
    except Exception as e:
        print(f"Firestore profile creation failed: {e}")
        # Clean up: delete the auth user to avoid stranded account
        try:
            auth.delete_user(uid)
            print("Cleaned up Firebase Auth user due to Firestore failure")
        except:
            pass
        raise RuntimeError(f"Profile creation failed (user rolled back): {e}")

    return {
        "success": True,
        "uid": uid,
        "email": user_record.email,
        "name": name,
        "username": username,
        "message": "User created and profile stored successfully.",
        "timestamp": datetime.now().isoformat()
    }

# ─────────────────────────
# 4. LOGIN FLOW
# ─────────────────────────
def login_with_email_password(email: str, password: str):
    """
    Backend version of frontend login functionality.
    Authenticates user and updates last login in Firestore.
    """
    print(f"\nStarting login process for {email}")
    
    # Validation (matching frontend validation)
    if not email.strip() or not password:
        raise ValueError("Please enter both email and password")

    endpoint = (
        "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"
        f"?key={FIREBASE_WEB_API_KEY}"
    )

    payload = {
        "email": email.strip().lower(),
        "password": password,
        "returnSecureToken": True,
    }

    try:
        print("Authenticating with Firebase...")
        resp = requests.post(endpoint, json=payload)

        if resp.status_code != 200:
            data = resp.json()
            err_code = data.get("error", {}).get("message", "UNKNOWN")
            print(f"Authentication failed: {err_code}")
            raise RuntimeError(f"Login failed: {err_code}")

        data = resp.json()
        uid = data["localId"]
        print(f"Authentication successful: {uid}")

    except requests.RequestException as e:
        print(f"Network error during authentication: {e}")
        raise RuntimeError(f"Login failed: Network error - {e}")

    # Get user profile to update last login
    try:
        print("Updating user profile in Firestore...")
        doc_ref = _user_doc_ref(uid)
        user_doc = doc_ref.get()
        
        if user_doc.exists:
            user_data = user_doc.to_dict()
            name = user_data.get("name", "Unknown User")
            username = user_data.get("username", "unknown")
            
            # Update last login
            create_user_profile(
                uid=uid,
                name=name,
                username=username,
                email=email,
            )
            print(f"Last login updated for {name} ({username})")
        else:
            print("User profile not found in Firestore, creating basic profile...")
            # Create a basic profile if it doesn't exist
            create_user_profile(
                uid=uid,
                name="Unknown User",
                username=f"user_{uid[:8]}",
                email=email,
            )
            
    except Exception as e:
        print(f"Login succeeded but Firestore update failed: {e}")
        # Don't fail the login if Firestore update fails
        pass

    return {
        "success": True,
        "uid": uid,
        "email": email.strip().lower(),
        "idToken": data["idToken"],
        "refreshToken": data["refreshToken"],
        "expiresInSeconds": int(data["expiresIn"]),
        "message": "Login successful, Firestore lastLogin updated.",
        "timestamp": datetime.now().isoformat()
    }

# ─────────────────────────
# 5. Additional utility functions
# ─────────────────────────
def get_user_profile(uid: str):
    """Get user profile from Firestore"""
    try:
        doc_ref = _user_doc_ref(uid)
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict()
        else:
            return None
    except Exception as e:
        print(f"Error getting user profile: {e}")
        return None

def list_all_users():
    """List all users in the database (for testing)"""
    try:
        users = db.collection("users").stream()
        print("\nAll users in database:")
        print("-" * 50)
        for user in users:
            data = user.to_dict()
            print(f"UID: {user.id}")
            print(f"Name: {data.get('name', 'N/A')}")
            print(f"Username: {data.get('username', 'N/A')}")
            print(f"Email: {data.get('email', 'N/A')}")
            print(f"Created: {data.get('createdAt', 'N/A')}")
            print(f"Last Login: {data.get('lastLoginAt', 'N/A')}")
            print("-" * 50)
    except Exception as e:
        print(f"Error listing users: {e}")

# ─────────────────────────
# 7. Profile Management Functions
# ─────────────────────────
def update_user_profile(uid: str, updates: dict):
    """
    Update user profile fields.
    Only updates fields that are provided in the updates dict.
    """
    try:
        doc_ref = _user_doc_ref(uid)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise ValueError(f"User profile not found for UID: {uid}")
        
        # Prepare update dict, converting field names to match Firestore schema
        firestore_updates = {}
        
        if "interests" in updates and updates["interests"] is not None:
            firestore_updates["interests"] = updates["interests"]
        
        if "birthday" in updates and updates["birthday"] is not None:
            # Convert date to Firestore timestamp
            from datetime import datetime, date as date_type
            birthday = updates["birthday"]
            if isinstance(birthday, str):
                birthday_date = datetime.fromisoformat(birthday.replace('Z', '+00:00'))
            elif isinstance(birthday, date_type):
                # Convert date to datetime (midnight)
                birthday_date = datetime.combine(birthday, datetime.min.time())
            else:
                birthday_date = birthday
            firestore_updates["birthday"] = birthday_date
        
        if "profile_description" in updates and updates["profile_description"] is not None:
            firestore_updates["profileDescription"] = updates["profile_description"]
        elif "profileDescription" in updates and updates["profileDescription"] is not None:
            firestore_updates["profileDescription"] = updates["profileDescription"]
        
        if "gender" in updates and updates["gender"] is not None:
            firestore_updates["gender"] = updates["gender"]
        
        if "preferred_name" in updates and updates["preferred_name"] is not None:
            firestore_updates["preferredName"] = updates["preferred_name"]
        elif "preferredName" in updates and updates["preferredName"] is not None:
            firestore_updates["preferredName"] = updates["preferredName"]
        
        if "bio" in updates and updates["bio"] is not None:
            firestore_updates["bio"] = updates["bio"]
        
        if "profile_picture" in updates and updates["profile_picture"] is not None:
            firestore_updates["profilePicture"] = updates["profile_picture"]
        elif "profilePicture" in updates and updates["profilePicture"] is not None:
            firestore_updates["profilePicture"] = updates["profilePicture"]
        
        if "hiking_level" in updates and updates["hiking_level"] is not None:
            firestore_updates["hikingLevel"] = updates["hiking_level"]
        elif "hikingLevel" in updates and updates["hikingLevel"] is not None:
            firestore_updates["hikingLevel"] = updates["hikingLevel"]
        
        if "home_address" in updates and updates["home_address"] is not None:
            # Handle home address object
            home_addr = updates["home_address"]
            if isinstance(home_addr, dict):
                firestore_updates["homeAddress"] = {
                    "street": home_addr.get("street"),
                    "city": home_addr.get("city"),
                    "state": home_addr.get("state"),
                    "zipCode": home_addr.get("zip_code") or home_addr.get("zipCode"),
                    "country": home_addr.get("country"),
                    "latitude": home_addr.get("latitude"),
                    "longitude": home_addr.get("longitude"),
                    "formattedAddress": home_addr.get("formatted_address") or home_addr.get("formattedAddress"),
                }
        elif "homeAddress" in updates and updates["homeAddress"] is not None:
            # Handle camelCase version
            home_addr = updates["homeAddress"]
            if isinstance(home_addr, dict):
                firestore_updates["homeAddress"] = home_addr
        
        if not firestore_updates:
            raise ValueError("No valid fields to update")
        
        doc_ref.update(firestore_updates)
        print(f"Profile updated for user {uid}")
        
        # Return updated profile
        updated_doc = doc_ref.get()
        return updated_doc.to_dict() if updated_doc.exists else None
        
    except Exception as e:
        print(f"Error updating user profile: {e}")
        raise RuntimeError(f"Failed to update profile: {e}")

def promote_user_to_wayfarer(admin_uid: str, target_uid: str):
    """
    Promote a user to wayfarer status. Only admins can perform this action.
    
    Args:
        admin_uid: UID of the admin performing the promotion
        target_uid: UID of the user to promote
    
    Returns:
        Updated user profile
    """
    try:
        # Check if admin exists and has admin status
        admin_ref = _user_doc_ref(admin_uid)
        admin_doc = admin_ref.get()
        
        if not admin_doc.exists:
            raise ValueError(f"Admin user not found: {admin_uid}")
        
        admin_data = admin_doc.to_dict()
        admin_status = admin_data.get("status", "user")
        
        if admin_status != "admin":
            raise ValueError("Only admins can promote users to wayfarer")
        
        # Check if target user exists
        target_ref = _user_doc_ref(target_uid)
        target_doc = target_ref.get()
        
        if not target_doc.exists:
            raise ValueError(f"Target user not found: {target_uid}")
        
        # Update target user's status
        target_ref.update({"status": "wayfarer"})
        print(f"User {target_uid} promoted to wayfarer by admin {admin_uid}")
        
        # Return updated profile
        updated_doc = target_ref.get()
        return updated_doc.to_dict() if updated_doc.exists else None
        
    except ValueError as e:
        raise ValueError(str(e))
    except Exception as e:
        print(f"Error promoting user to wayfarer: {e}")
        raise RuntimeError(f"Failed to promote user: {e}")

# ─────────────────────────
# 6. Interactive CLI test
# ─────────────────────────
def interactive_test():
    """Interactive testing interface"""
    print("TrailMix Backend Authentication Test")
    print("=" * 50)
    
    while True:
        print("\nChoose an option:")
        print("1. Sign up new user")
        print("2. Login existing user")
        print("3. Get user profile")
        print("4. List all users")
        print("5. Exit")
        
        choice = input("\nEnter your choice (1-5): ").strip()
        
        if choice == "1":
            print("\nSIGN UP")
            print("-" * 20)
            name = input("Full Name: ").strip()
            username = input("Username: ").strip()
            email = input("Email: ").strip()
            password = input("Password: ").strip()
            
            try:
                result = signup_with_email_password(name, username, email, password)
                print(f"\nSUCCESS: {json.dumps(result, indent=2)}")
            except Exception as e:
                print(f"\nERROR: {e}")
                
        elif choice == "2":
            print("\nLOGIN")
            print("-" * 20)
            email = input("Email: ").strip()
            password = input("Password: ").strip()
            
            try:
                result = login_with_email_password(email, password)
                print(f"\nSUCCESS: {json.dumps(result, indent=2)}")
            except Exception as e:
                print(f"\nERROR: {e}")
                
        elif choice == "3":
            print("\nGET USER PROFILE")
            print("-" * 20)
            uid = input("User UID: ").strip()
            
            profile = get_user_profile(uid)
            if profile:
                print(f"\nPROFILE: {json.dumps(profile, indent=2, default=str)}")
            else:
                print("\nUser not found")
                
        elif choice == "4":
            list_all_users()
            
        elif choice == "5":
            print("\nGoodbye!")
            break
            
        else:
            print("\nInvalid choice. Please try again.")

if __name__ == "__main__":
    print("Starting TrailMix Backend Authentication System")
    print("=" * 60)
    
    # Run interactive test
    interactive_test()
