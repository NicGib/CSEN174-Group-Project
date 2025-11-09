"""
Test the L2AP algorithm to see if it correctly calculates similarity for identical interests.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from matching.profile_matching import (
    normalize_interests, 
    get_profile_vector,
    L2APIndex,
    l2ap_knn
)

# Create two identical interest vectors
interests1 = ["hiking", "camping", "photography"]
interests2 = ["hiking", "camping", "photography"]

vec1 = normalize_interests(interests1)
vec2 = normalize_interests(interests2)

print("Testing L2AP algorithm with identical interests")
print(f"User 1 interests: {interests1}")
print(f"User 2 interests: {interests2}")
print(f"User 1 vector: {vec1}")
print(f"User 2 vector: {vec2}")

# Build index with user 2
index = L2APIndex()
index.add_document("user2", vec2)

print(f"\nIndex built with user2")
print(f"Index doc_ids: {index.doc_ids}")

# Query with user 1's vector
matches = l2ap_knn(vec1, index, k=10, t_min=0.0, exclude_doc_ids=set())

print(f"\nMatches found: {len(matches)}")
for uid, similarity in matches:
    print(f"  User {uid}: similarity = {similarity:.6f}")

if matches:
    expected_sim = 1.0
    actual_sim = matches[0][1]
    print(f"\nExpected similarity: {expected_sim:.6f}")
    print(f"Actual similarity: {actual_sim:.6f}")
    print(f"Difference: {abs(actual_sim - expected_sim):.6f}")
    if abs(actual_sim - expected_sim) > 0.01:
        print("ERROR: Similarity is incorrect!")
    else:
        print("OK: Similarity is correct")
else:
    print("ERROR: No matches found!")

# Also test manual dot product calculation
all_keys = set(vec1.keys()) | set(vec2.keys())
manual_dot = sum(vec1.get(k, 0) * vec2.get(k, 0) for k in all_keys)
print(f"\nManual dot product calculation: {manual_dot:.6f}")

