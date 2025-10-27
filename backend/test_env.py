#!/usr/bin/env python3
"""
Test script to verify environment variables are loaded correctly
"""

import os
import sys
from dotenv import load_dotenv

# Add the current directory to the path so we can import from accounts
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_environment_variables():
    """Test if environment variables are loaded correctly"""
    print("Testing Environment Variables")
    print("=" * 40)
    
    # Load environment variables
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    print(f"Loading .env from: {env_path}")
    
    if not os.path.exists(env_path):
        print(".env file not found")
        return False
    
    load_dotenv(env_path)
    
    # Test each environment variable
    env_vars = {
        'FIREBASE_API_KEY': os.getenv('FIREBASE_API_KEY'),
        'FIREBASE_AUTH_DOMAIN': os.getenv('FIREBASE_AUTH_DOMAIN'),
        'FIREBASE_PROJECT_ID': os.getenv('FIREBASE_PROJECT_ID'),
        'FIREBASE_STORAGE_BUCKET': os.getenv('FIREBASE_STORAGE_BUCKET'),
        'FIREBASE_MESSAGING_SENDER_ID': os.getenv('FIREBASE_MESSAGING_SENDER_ID'),
        'FIREBASE_APP_ID': os.getenv('FIREBASE_APP_ID'),
    }
    
    all_good = True
    for var_name, var_value in env_vars.items():
        if var_value:
            print(f"{var_name}: {var_value[:20]}..." if len(var_value) > 20 else f"{var_name}: {var_value}")
        else:
            print(f"{var_name}: Not found")
            all_good = False
    
    return all_good

def test_imports():
    """Test if required packages can be imported"""
    print("\nTesting Package Imports")
    print("=" * 40)
    
    packages = ['firebase_admin', 'requests', 'dotenv']
    all_good = True
    
    for package in packages:
        try:
            __import__(package)
            print(f"{package}: Available")
        except ImportError as e:
            print(f"{package}: {e}")
            all_good = False
    
    return all_good

def main():
    """Main test function"""
    print("TrailMix Backend Environment Test")
    print("=" * 50)
    
    env_ok = test_environment_variables()
    imports_ok = test_imports()
    
    print("\n" + "=" * 50)
    if env_ok and imports_ok:
        print("Environment setup is working correctly!")
        print("\nNext steps:")
        print("1. Download serviceAccountKey.json from Firebase Console")
        print("2. Place it in backend/accounts/serviceAccountKey.json")
        print("3. Run: python accounts/signups.py")
        return True
    else:
        print("Some issues found. Please fix them before proceeding.")
        return False

if __name__ == "__main__":
    main()
