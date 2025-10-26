#!/usr/bin/env python3
"""
Test runner script for the map download functionality.
Run this script to execute all tests.
"""

import subprocess
import sys
import os

def run_tests():
    """Run all tests using pytest"""
    # Change to the backend directory
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(backend_dir)
    
    # Run pytest with verbose output
    cmd = [sys.executable, "-m", "pytest", "maps/tests/", "-v", "--tb=short"]
    
    print("Running tests for map download functionality...")
    print(f"Command: {' '.join(cmd)}")
    print("-" * 50)
    
    try:
        result = subprocess.run(cmd, check=True)
        print("\n" + "=" * 50)
        print("All tests passed! ✅")
        return 0
    except subprocess.CalledProcessError as e:
        print("\n" + "=" * 50)
        print(f"Tests failed with exit code {e.returncode} ❌")
        return e.returncode

if __name__ == "__main__":
    sys.exit(run_tests())
