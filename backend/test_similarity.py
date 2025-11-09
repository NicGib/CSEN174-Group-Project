"""
Test script to verify similarity calculation for identical interests.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from matching.profile_matching import normalize_interests, get_profile_vector
import math

def calculate_cosine_similarity(vec1, vec2):
    """Calculate cosine similarity between two vectors."""
    # Get all unique keys
    all_keys = set(vec1.keys()) | set(vec2.keys())
    
    # Calculate dot product
    dot_product = sum(vec1.get(k, 0) * vec2.get(k, 0) for k in all_keys)
    
    # For unit-normalized vectors, dot product = cosine similarity
    return dot_product

# Test case: Two users with identical interests
interests1 = ["hiking", "camping", "photography"]
interests2 = ["hiking", "camping", "photography"]

print("Test 1: Identical interests")
print(f"User 1 interests: {interests1}")
print(f"User 2 interests: {interests2}")

vec1 = normalize_interests(interests1)
vec2 = normalize_interests(interests2)

print(f"\nUser 1 vector: {vec1}")
print(f"User 2 vector: {vec2}")

similarity = calculate_cosine_similarity(vec1, vec2)
print(f"\nCosine Similarity: {similarity:.4f}")
print(f"Expected: 1.0000")
print(f"Match: {'✓' if abs(similarity - 1.0) < 0.0001 else '✗'}")

# Test case: Different number of interests
print("\n" + "="*50)
print("Test 2: Different number of interests")
interests3 = ["hiking", "camping"]
interests4 = ["hiking", "camping", "photography", "backpacking"]

print(f"User 3 interests: {interests3}")
print(f"User 4 interests: {interests4}")

vec3 = normalize_interests(interests3)
vec4 = normalize_interests(interests4)

print(f"\nUser 3 vector: {vec3}")
print(f"User 4 vector: {vec4}")

similarity2 = calculate_cosine_similarity(vec3, vec4)
print(f"\nCosine Similarity: {similarity2:.4f}")
print(f"Expected: 0.7071 (2 shared / sqrt(2) * sqrt(4) = 2/2.828 = 0.707)")

# Test case: Check normalization
print("\n" + "="*50)
print("Test 3: Vector normalization check")
for i, (k, v) in enumerate(vec1.items()):
    print(f"Interest '{k}': value = {v:.6f}, expected = {1/math.sqrt(len(interests1)):.6f}")

# Test case: What if interests are in different order?
print("\n" + "="*50)
print("Test 4: Same interests, different order")
interests5 = ["photography", "hiking", "camping"]
vec5 = normalize_interests(interests5)
similarity3 = calculate_cosine_similarity(vec1, vec5)
print(f"User 1: {interests1}")
print(f"User 5: {interests5}")
print(f"Similarity: {similarity3:.4f}")
print(f"Expected: 1.0000")
print(f"Match: {'✓' if abs(similarity3 - 1.0) < 0.0001 else '✗'}")

