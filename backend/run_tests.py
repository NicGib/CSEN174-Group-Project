#!/usr/bin/env python3
"""
Comprehensive test runner for TrailMix Backend
Runs all tests including scheduling, authentication, and maps functionality
"""

import subprocess
import sys
import os
import argparse
from pathlib import Path

def run_tests(test_type=None, verbose=False, coverage=False):
    """
    Run tests using pytest
    
    Args:
        test_type: Specific test type to run ('auth', 'schedule', 'maps', 'all')
        verbose: Enable verbose output
        coverage: Enable coverage reporting
    """
    print("🧪 Running TrailMix Backend Test Suite")
    print("=" * 60)
    
    # Change to backend directory
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(backend_dir)
    
    # Build pytest command
    cmd = [sys.executable, "-m", "pytest"]
    
    # Add test files based on type
    if test_type == "auth":
        cmd.extend(["tests/test_auth.py", "test_auth.py"])
    elif test_type == "schedule":
        cmd.extend(["tests/test_schedule.py"])
    elif test_type == "maps":
        cmd.extend(["tests/test_maps.py"])
    elif test_type == "env":
        cmd.extend(["test_env.py"])
    else:  # all or None
        cmd.extend([
            "tests/test_auth.py",
            "tests/test_schedule.py", 
            "tests/test_maps.py",
            "test_auth.py",
            "test_env.py"
        ])
    
    # Add options
    if verbose:
        cmd.append("-v")
    else:
        cmd.append("-q")
    
    cmd.extend(["--tb=short", "--strict-markers"])
    
    if coverage:
        cmd.extend(["--cov=.", "--cov-report=html", "--cov-report=term"])
    
    try:
        print(f"Running command: {' '.join(cmd)}")
        print("-" * 60)
        
        result = subprocess.run(cmd, capture_output=False, text=True)
        
        return result.returncode == 0
        
    except Exception as e:
        print(f"❌ Error running tests: {e}")
        return False

def run_specific_test(test_file, verbose=False):
    """Run a specific test file"""
    print(f"🧪 Running specific test: {test_file}")
    print("=" * 50)
    
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(backend_dir)
    
    cmd = [sys.executable, "-m", "pytest", test_file]
    
    if verbose:
        cmd.append("-v")
    else:
        cmd.append("-q")
    
    cmd.extend(["--tb=short"])
    
    try:
        result = subprocess.run(cmd, capture_output=False, text=True)
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error running test {test_file}: {e}")
        return False

def list_available_tests():
    """List all available test files"""
    print("📋 Available Test Files:")
    print("=" * 30)
    
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    test_files = []
    
    # Find test files in tests directory
    tests_dir = os.path.join(backend_dir, "tests")
    if os.path.exists(tests_dir):
        for file in os.listdir(tests_dir):
            if file.startswith("test_") and file.endswith(".py"):
                test_files.append(f"tests/{file}")
    
    # Find test files in root directory
    for file in os.listdir(backend_dir):
        if file.startswith("test_") and file.endswith(".py"):
            test_files.append(file)
    
    for i, test_file in enumerate(test_files, 1):
        print(f"{i:2d}. {test_file}")
    
    print(f"\nTotal: {len(test_files)} test files")

def main():
    """Main function with command line argument parsing"""
    parser = argparse.ArgumentParser(description="TrailMix Backend Test Runner")
    parser.add_argument(
        "--type", 
        choices=["auth", "schedule", "maps", "env", "all"],
        default="all",
        help="Type of tests to run (default: all)"
    )
    parser.add_argument(
        "--file", 
        type=str,
        help="Run a specific test file"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose output"
    )
    parser.add_argument(
        "--coverage", "-c",
        action="store_true", 
        help="Enable coverage reporting"
    )
    parser.add_argument(
        "--list", "-l",
        action="store_true",
        help="List available test files"
    )
    
    args = parser.parse_args()
    
    if args.list:
        list_available_tests()
        return
    
    if args.file:
        success = run_specific_test(args.file, args.verbose)
    else:
        success = run_tests(args.type, args.verbose, args.coverage)
    
    if success:
        print("\n✅ All tests passed!")
        if args.coverage:
            print("📊 Coverage report generated in htmlcov/index.html")
    else:
        print("\n❌ Some tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()