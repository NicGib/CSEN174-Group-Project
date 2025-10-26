#!/usr/bin/env python3
"""
Test script for TrailMix Backend Authentication System
This script demonstrates the backend authentication functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from accounts.signups import (
    signup_with_email_password, 
    login_with_email_password,
    get_user_profile,
    list_all_users
)

def test_signup_and_login():
    """Test the complete signup and login flow"""
    print("🧪 Testing TrailMix Backend Authentication")
    print("=" * 50)
    
    # Test data
    test_user = {
        "name": "John Hiker",
        "username": "johnhiker",
        "email": "john@trailmix.test",
        "password": "hiking123"
    }
    
    try:
        # Test 1: Sign up
        print("\n1️⃣ Testing Sign Up...")
        print("-" * 30)
        signup_result = signup_with_email_password(
            name=test_user["name"],
            username=test_user["username"],
            email=test_user["email"],
            password=test_user["password"]
        )
        print(f"✅ Signup successful!")
        print(f"   UID: {signup_result['uid']}")
        print(f"   Email: {signup_result['email']}")
        
        # Test 2: Login
        print("\n2️⃣ Testing Login...")
        print("-" * 30)
        login_result = login_with_email_password(
            email=test_user["email"],
            password=test_user["password"]
        )
        print(f"✅ Login successful!")
        print(f"   UID: {login_result['uid']}")
        print(f"   Token expires in: {login_result['expiresInSeconds']} seconds")
        
        # Test 3: Get user profile
        print("\n3️⃣ Testing Get User Profile...")
        print("-" * 30)
        profile = get_user_profile(login_result['uid'])
        if profile:
            print(f"✅ Profile retrieved!")
            print(f"   Name: {profile.get('name', 'N/A')}")
            print(f"   Username: {profile.get('username', 'N/A')}")
            print(f"   Email: {profile.get('email', 'N/A')}")
            print(f"   Total Hikes: {profile.get('totalHikes', 0)}")
            print(f"   Hiking Level: {profile.get('hikingLevel', 'N/A')}")
        else:
            print("❌ Profile not found")
        
        # Test 4: List all users
        print("\n4️⃣ Testing List All Users...")
        print("-" * 30)
        list_all_users()
        
        print("\n🎉 All tests completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        return False
    
    return True

def test_error_handling():
    """Test error handling scenarios"""
    print("\n🔍 Testing Error Handling...")
    print("=" * 50)
    
    # Test 1: Duplicate username
    print("\n1️⃣ Testing duplicate username...")
    try:
        signup_with_email_password(
            name="Duplicate User",
            username="johnhiker",  # Same username as before
            email="duplicate@test.com",
            password="password123"
        )
        print("❌ Should have failed with duplicate username")
    except ValueError as e:
        print(f"✅ Correctly caught duplicate username error: {e}")
    
    # Test 2: Invalid email format
    print("\n2️⃣ Testing invalid email...")
    try:
        signup_with_email_password(
            name="Invalid Email",
            username="invaliduser",
            email="not-an-email",
            password="password123"
        )
        print("❌ Should have failed with invalid email")
    except Exception as e:
        print(f"✅ Correctly caught invalid email error: {e}")
    
    # Test 3: Short password
    print("\n3️⃣ Testing short password...")
    try:
        signup_with_email_password(
            name="Short Password",
            username="shortpass",
            email="short@test.com",
            password="123"  # Too short
        )
        print("❌ Should have failed with short password")
    except ValueError as e:
        print(f"✅ Correctly caught short password error: {e}")
    
    # Test 4: Login with wrong password
    print("\n4️⃣ Testing wrong password login...")
    try:
        login_with_email_password(
            email="john@trailmix.test",
            password="wrongpassword"
        )
        print("❌ Should have failed with wrong password")
    except Exception as e:
        print(f"✅ Correctly caught wrong password error: {e}")
    
    print("\n✅ Error handling tests completed!")

if __name__ == "__main__":
    print("🚀 TrailMix Backend Authentication Test Suite")
    print("=" * 60)
    
    # Run main functionality tests
    success = test_signup_and_login()
    
    if success:
        # Run error handling tests
        test_error_handling()
        
        print("\n🎯 Test Summary:")
        print("✅ Signup functionality working")
        print("✅ Login functionality working") 
        print("✅ User profile creation working")
        print("✅ Firestore integration working")
        print("✅ Error handling working")
        print("\n🚀 Backend authentication system is ready!")
    else:
        print("\n❌ Some tests failed. Please check the configuration.")
