"""
Debug script to check what might cause 0.58 similarity.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from matching.profile_matching import normalize_interests
import math

# Test: What if there are duplicate interests?
print("Test: Duplicate interests")
interests_dup = ["hiking", "hiking", "camping", "camping", "photography"]
vec_dup = normalize_interests(interests_dup)
print(f"Interests with duplicates: {interests_dup}")
print(f"Normalized vector: {vec_dup}")
print(f"Number of unique interests: {len(vec_dup)}")
print(f"Each value: {list(vec_dup.values())[0] if vec_dup else 'N/A'}")
print(f"Expected value for 3 unique interests: {1/math.sqrt(3):.6f}")

# Test: What if interests have different casing or whitespace?
print("\n" + "="*50)
print("Test: Case sensitivity and whitespace")
interests1 = ["Hiking", "Camping", "Photography"]
interests2 = ["hiking", "camping", "photography"]
vec1 = normalize_interests(interests1)
vec2 = normalize_interests(interests2)
print(f"User 1 (mixed case): {interests1}")
print(f"User 2 (lowercase): {interests2}")
print(f"User 1 vector: {vec1}")
print(f"User 2 vector: {vec2}")

# Calculate similarity
all_keys = set(vec1.keys()) | set(vec2.keys())
dot_product = sum(vec1.get(k, 0) * vec2.get(k, 0) for k in all_keys)
print(f"Similarity: {dot_product:.4f}")

# Test: What if one user has extra interests?
print("\n" + "="*50)
print("Test: One user has subset of other's interests")
interests_a = ["hiking", "camping"]
interests_b = ["hiking", "camping", "photography"]
vec_a = normalize_interests(interests_a)
vec_b = normalize_interests(interests_b)
dot_product_ab = sum(vec_a.get(k, 0) * vec_b.get(k, 0) for k in set(vec_a.keys()) | set(vec_b.keys()))
print(f"User A: {interests_a}")
print(f"User B: {interests_b}")
print(f"Similarity: {dot_product_ab:.4f}")
print(f"Expected: {2/math.sqrt(2*3):.4f} = {math.sqrt(2/3):.4f}")

# Test: What if there's a bug where only one interest is matched?
print("\n" + "="*50)
print("Test: What if only one interest is being matched?")
# If only one interest matched out of 3, similarity would be:
# (1/sqrt(3)) * (1/sqrt(3)) = 1/3 ≈ 0.333
# But 0.58 is approximately 1/sqrt(3) ≈ 0.577
# So maybe it's matching 1 interest but the normalization is wrong?

# Actually, wait - if we have 3 interests and only match 1:
# vec1 has: {interest1: 1/sqrt(3), interest2: 1/sqrt(3), interest3: 1/sqrt(3)}
# vec2 has: {interest1: 1/sqrt(3), interest2: 1/sqrt(3), interest3: 1/sqrt(3)}
# If only interest1 matches: (1/sqrt(3)) * (1/sqrt(3)) = 1/3 = 0.333

# But 0.58 is 1/sqrt(3). That's the normalized value of a single interest when there are 3 total.
# So maybe the issue is that the dot product is only counting one term, and that term is 1/sqrt(3)?

print("If only 1 out of 3 interests matched:")
single_match = (1/math.sqrt(3)) * (1/math.sqrt(3))
print(f"Similarity would be: {single_match:.4f} = 1/3 = 0.3333")
print(f"But 0.58 is approximately: {1/math.sqrt(3):.4f}")
print("So maybe the issue is different...")

# What if the vectors aren't being normalized correctly in the index?
print("\n" + "="*50)
print("Checking: What if normalization happens twice?")
# If normalized twice: first norm = sqrt(3), second norm = sqrt(3 * (1/sqrt(3))^2) = sqrt(1) = 1
# So that shouldn't be the issue either.

print("\nConclusion: The similarity calculation itself is correct.")
print("The 0.58 value suggests there might be an issue with:")
print("1. How interests are stored/retrieved from Firestore")
print("2. How the index is built")
print("3. How the accumulator is being computed in the L2AP algorithm")

