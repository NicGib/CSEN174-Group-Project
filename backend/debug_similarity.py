"""
Debug script to check why two users with "identical" interests get 0.58 similarity.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from matching.profile_matching import get_profile_vector, normalize_interests
from accounts.signups import get_user_profile

def debug_user_interests(uid1: str, uid2: str):
    """Debug why two users might have different similarity scores."""
    print(f"Debugging similarity between {uid1} and {uid2}")
    print("="*60)
    
    # Get profiles
    profile1 = get_user_profile(uid1)
    profile2 = get_user_profile(uid2)
    
    if not profile1:
        print(f"ERROR: User {uid1} not found")
        return
    if not profile2:
        print(f"ERROR: User {uid2} not found")
        return
    
    # Get interests
    interests1_raw = profile1.get("interests", [])
    interests2_raw = profile2.get("interests", [])
    
    print(f"\nUser 1 ({uid1}):")
    print(f"  Raw interests: {interests1_raw}")
    print(f"  Type: {type(interests1_raw)}")
    print(f"  Length: {len(interests1_raw) if interests1_raw else 0}")
    if interests1_raw:
        print(f"  Has duplicates: {len(interests1_raw) != len(set(interests1_raw))}")
        if len(interests1_raw) != len(set(interests1_raw)):
            print(f"  Duplicates: {[x for x in interests1_raw if interests1_raw.count(x) > 1]}")
    
    print(f"\nUser 2 ({uid2}):")
    print(f"  Raw interests: {interests2_raw}")
    print(f"  Type: {type(interests2_raw)}")
    print(f"  Length: {len(interests2_raw) if interests2_raw else 0}")
    if interests2_raw:
        print(f"  Has duplicates: {len(interests2_raw) != len(set(interests2_raw))}")
        if len(interests2_raw) != len(set(interests2_raw)):
            print(f"  Duplicates: {[x for x in interests2_raw if interests2_raw.count(x) > 1]}")
    
    # Normalize interests
    vec1 = normalize_interests(interests1_raw) if interests1_raw else {}
    vec2 = normalize_interests(interests2_raw) if interests2_raw else {}
    
    print(f"\nNormalized vectors:")
    print(f"  User 1: {vec1}")
    print(f"  User 2: {vec2}")
    print(f"  User 1 unique interests: {set(vec1.keys())}")
    print(f"  User 2 unique interests: {set(vec2.keys())}")
    
    # Check if they're the same
    if set(vec1.keys()) == set(vec2.keys()):
        print(f"\n✓ Interests are identical (same unique set)")
    else:
        print(f"\n✗ Interests are NOT identical")
        print(f"  Only in user 1: {set(vec1.keys()) - set(vec2.keys())}")
        print(f"  Only in user 2: {set(vec2.keys()) - set(vec1.keys())}")
        print(f"  Shared: {set(vec1.keys()) & set(vec2.keys())}")
    
    # Calculate similarity
    all_keys = set(vec1.keys()) | set(vec2.keys())
    dot_product = sum(vec1.get(k, 0) * vec2.get(k, 0) for k in all_keys)
    
    print(f"\nSimilarity calculation:")
    print(f"  Dot product: {dot_product:.6f}")
    print(f"  Expected for identical: 1.000000")
    if abs(dot_product - 1.0) < 0.01:
        print(f"  ✓ Similarity is correct (1.0)")
    else:
        print(f"  ✗ Similarity is incorrect")
        print(f"    Difference: {abs(dot_product - 1.0):.6f}")
        
        # Calculate what the similarity should be
        shared = set(vec1.keys()) & set(vec2.keys())
        print(f"    Shared interests: {len(shared)} out of {len(all_keys)} total")
        if len(shared) > 0:
            # Manual calculation for shared interests
            shared_sim = sum(vec1.get(k, 0) * vec2.get(k, 0) for k in shared)
            print(f"    Similarity from shared interests only: {shared_sim:.6f}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python debug_similarity.py <uid1> <uid2>")
        print("Example: python debug_similarity.py user123 user456")
    else:
        debug_user_interests(sys.argv[1], sys.argv[2])

