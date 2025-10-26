#!/usr/bin/env python3
"""
Setup script for TrailMix Backend Environment
This script helps you set up the environment variables and verify the configuration.
"""

import os
import json
from pathlib import Path

def create_env_file():
    """Create .env file for backend"""
    env_content = """# Firebase Configuration
FIREBASE_API_KEY=AIzaSyBOt1BYpqlPxYajlhHUqDRNqaFYvuFpfAA
FIREBASE_AUTH_DOMAIN=trailmix-1da3c.firebaseapp.com
FIREBASE_PROJECT_ID=trailmix-1da3c
FIREBASE_STORAGE_BUCKET=trailmix-1da3c.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=902468001555
FIREBASE_APP_ID=1:902468001555:web:6da6b6ba90812872ac44e6
"""
    
    env_path = Path(".env")
    if env_path.exists():
        print("✅ .env file already exists")
        return True
    
    try:
        with open(env_path, 'w') as f:
            f.write(env_content)
        print("✅ Created .env file")
        return True
    except Exception as e:
        print(f"❌ Failed to create .env file: {e}")
        return False

def check_service_account_key():
    """Check if service account key exists"""
    key_path = Path("accounts/serviceAccountKey.json")
    if key_path.exists():
        print("✅ Service account key found")
        
        # Validate the JSON structure
        try:
            with open(key_path, 'r') as f:
                key_data = json.load(f)
            
            required_fields = ['type', 'project_id', 'private_key', 'client_email']
            missing_fields = [field for field in required_fields if field not in key_data]
            
            if missing_fields:
                print(f"⚠️  Service account key missing fields: {missing_fields}")
                return False
            
            if key_data.get('project_id') != 'trailmix-1da3c':
                print(f"⚠️  Service account key project ID mismatch. Expected: trailmix-1da3c, Got: {key_data.get('project_id')}")
                return False
            
            print("✅ Service account key is valid")
            return True
            
        except json.JSONDecodeError:
            print("❌ Service account key is not valid JSON")
            return False
    else:
        print("❌ Service account key not found")
        print("   Please download it from Firebase Console and place it in accounts/serviceAccountKey.json")
        return False

def check_dependencies():
    """Check if required dependencies are installed"""
    required_packages = ['firebase_admin', 'requests', 'dotenv']
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"❌ Missing packages: {missing_packages}")
        print("   Run: pip install firebase-admin requests python-dotenv")
        return False
    else:
        print("✅ All required packages are installed")
        return True

def main():
    """Main setup function"""
    print("🚀 TrailMix Backend Setup")
    print("=" * 40)
    
    # Check if we're in the right directory
    if not Path("accounts").exists():
        print("❌ Please run this script from the backend directory")
        return False
    
    print("\n1. Setting up environment variables...")
    env_ok = create_env_file()
    
    print("\n2. Checking service account key...")
    key_ok = check_service_account_key()
    
    print("\n3. Checking dependencies...")
    deps_ok = check_dependencies()
    
    print("\n" + "=" * 40)
    if env_ok and key_ok and deps_ok:
        print("🎉 Setup complete! You can now run:")
        print("   python accounts/signups.py")
        print("   python test_auth.py")
        return True
    else:
        print("❌ Setup incomplete. Please fix the issues above.")
        return False

if __name__ == "__main__":
    main()
