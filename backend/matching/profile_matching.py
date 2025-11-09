"""
L2AP-based k-NN profile matching system.

Implements the L2AP (L2 All-Pairs Similarity Search) algorithm for finding
k nearest neighbors based on user interests using cosine similarity.

Based on: "L2AP: Fast Cosine Similarity Search With Prefix L2-Norm Bounds"
(Anastasiu & Karypis, ICDE 2014)
"""

import math
import heapq
from typing import Dict, List, Tuple, Optional, Set
from collections import defaultdict
import firebase_admin
from firebase_admin import firestore
import os
import json
from pathlib import Path

# Initialize Firestore - use the same db instance from signups
try:
    from backend.accounts.signups import db
except (ImportError, AttributeError):
    # Fallback: initialize Firestore if not already initialized
    if not firebase_admin._apps:
        from firebase_admin import credentials
        SERVICE_ACCOUNT_PATH = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
            'secrets', "serviceAccountKey.json"
        )
        if os.path.exists(SERVICE_ACCOUNT_PATH):
            cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
            firebase_admin.initialize_app(cred)
    
    db = firestore.client()

# ─────────────────────────
# 1. Vector Representation
# ─────────────────────────

def normalize_interests(interests: List[str]) -> Dict[str, float]:
    """
    Convert a list of interests into a sparse, unit-normalized vector.
    Uses binary weighting (1 if interest present, 0 otherwise).
    Handles duplicates by deduplicating the interests list first.
    
    Args:
        interests: List of interest strings
        
    Returns:
        Dictionary mapping interest -> weight (normalized)
    """
    if not interests:
        return {}
    
    # Deduplicate and normalize: convert to lowercase, strip whitespace, remove empty strings
    # Use a set to deduplicate, then convert back to dict for consistent ordering
    unique_interests = set()
    for interest in interests:
        normalized = interest.lower().strip()
        if normalized:  # Only add non-empty strings
            unique_interests.add(normalized)
    
    if not unique_interests:
        return {}
    
    # Binary weighting: each unique interest gets weight 1
    vector = {interest: 1.0 for interest in unique_interests}
    
    # Unit normalize: ||v||₂ = 1
    # For n unique interests, each gets weight 1/√n
    norm = math.sqrt(sum(v * v for v in vector.values()))
    if norm > 0:
        vector = {k: v / norm for k, v in vector.items()}
    
    return vector


def get_profile_vector(profile_data: dict) -> Dict[str, float]:
    """
    Extract and normalize interest vector from user profile.
    
    Args:
        profile_data: User profile dictionary from Firestore
        
    Returns:
        Normalized sparse vector of interests
    """
    interests = profile_data.get("interests", [])
    if not interests:
        return {}
    return normalize_interests(interests)


# ─────────────────────────
# 2. L2AP Index Structure
# ─────────────────────────

class L2APIndex:
    """
    L2AP inverted index for fast k-NN search.
    
    Stores:
    - Inverted index: feature -> [(doc_id, value, ||prefix||₂), ...]
    - Per-document metadata: doc_id -> (pscore, max_feature_value, ||vector||₂)
    """
    
    def __init__(self):
        # Inverted index: feature -> list of (doc_id, value, prefix_norm)
        self.inverted_index: Dict[str, List[Tuple[str, float, float]]] = defaultdict(list)
        
        # Document metadata: doc_id -> (pscore, max_value, norm)
        self.doc_metadata: Dict[str, Tuple[float, float, float]] = {}
        
        # Feature frequency for ordering
        self.feature_freq: Dict[str, int] = defaultdict(int)
        
        # All document IDs
        self.doc_ids: Set[str] = set()
    
    def add_document(self, doc_id: str, vector: Dict[str, float]):
        """
        Add a document vector to the index.
        
        Args:
            doc_id: Document identifier (user UID)
            vector: Sparse normalized vector
        """
        if not vector:
            return
        
        # Calculate vector norm
        vector_norm = math.sqrt(sum(v * v for v in vector.values()))
        if vector_norm == 0:
            return
        
        # Find max feature value
        max_value = max(vector.values()) if vector else 0.0
        
        # Sort features by value (descending) for prefix ordering
        sorted_features = sorted(vector.items(), key=lambda x: x[1], reverse=True)
        
        # Calculate prefix norms: ||prefix_j||₂ for each position j
        prefix_norms = {}
        running_norm_sq = 0.0
        for i, (feature, value) in enumerate(sorted_features):
            running_norm_sq += value * value
            prefix_norms[i] = math.sqrt(running_norm_sq)
        
        # Calculate pscore (prefix upper bound)
        # pscore = max over all features of (value * ||prefix||₂)
        pscore = 0.0
        for i, (feature, value) in enumerate(sorted_features):
            prefix_norm = prefix_norms.get(i, 0.0)
            bound = value * prefix_norm
            pscore = max(pscore, bound)
        
        # Store metadata
        self.doc_metadata[doc_id] = (pscore, max_value, vector_norm)
        self.doc_ids.add(doc_id)
        
        # Build inverted index (ordered by decreasing value)
        for i, (feature, value) in enumerate(sorted_features):
            prefix_norm = prefix_norms.get(i, 0.0)
            self.inverted_index[feature].append((doc_id, value, prefix_norm))
            self.feature_freq[feature] += 1
    
    def build_index(self, profiles: Dict[str, dict]):
        """
        Build index from a collection of profiles.
        
        Args:
            profiles: Dictionary mapping doc_id -> profile_data
        """
        self.inverted_index.clear()
        self.doc_metadata.clear()
        self.feature_freq.clear()
        self.doc_ids.clear()
        
        # Add all documents
        for doc_id, profile_data in profiles.items():
            vector = get_profile_vector(profile_data)
            if vector:
                self.add_document(doc_id, vector)
        
        # Sort inverted index postings by decreasing value (for efficiency)
        for feature in self.inverted_index:
            self.inverted_index[feature].sort(key=lambda x: x[1], reverse=True)
    
    def get_ordered_features(self, vector: Dict[str, float]) -> List[Tuple[str, float]]:
        """
        Get features ordered by decreasing value (suffix to prefix order).
        
        Args:
            vector: Sparse vector
            
        Returns:
            List of (feature, value) tuples in descending order
        """
        return sorted(vector.items(), key=lambda x: x[1], reverse=True)


# ─────────────────────────
# 3. L2AP k-NN Query
# ─────────────────────────

def l2ap_knn(
    query_vector: Dict[str, float],
    index: L2APIndex,
    k: int,
    t_min: float = 0.0,
    exclude_doc_ids: Optional[Set[str]] = None
) -> List[Tuple[str, float]]:
    """
    Find k nearest neighbors using L2AP algorithm with dynamic threshold.
    
    Args:
        query_vector: Query vector (normalized)
        index: L2AP index
        k: Number of neighbors to find
        t_min: Minimum similarity threshold
        exclude_doc_ids: Document IDs to exclude from results
        
    Returns:
        List of (doc_id, similarity) tuples, sorted by similarity (descending)
    """
    if not query_vector:
        return []
    
    if exclude_doc_ids is None:
        exclude_doc_ids = set()
    
    # Initialize heap (min-heap of size k)
    heap: List[Tuple[float, str]] = []  # (similarity, doc_id) - min-heap
    
    # Dynamic threshold: starts at t_min, updates to kth best
    theta = t_min
    
    # Accumulator for candidate scores
    accumulator: Dict[str, float] = defaultdict(float)
    
    # Get query features ordered by decreasing value (suffix to prefix)
    query_features = index.get_ordered_features(query_vector)
    
    # Calculate remaining prefix norms for query (rs₄)
    query_prefix_norms = {}
    running_norm_sq = 0.0
    for i, (feature, value) in enumerate(query_features):
        running_norm_sq += value * value
        query_prefix_norms[i] = math.sqrt(running_norm_sq)
    
    # Reverse to get suffix norms (remaining norm after position i)
    query_suffix_norms = {}
    total_norm_sq = sum(v * v for v in query_vector.values())
    running_suffix_sq = total_norm_sq
    for i, (feature, value) in enumerate(query_features):
        query_suffix_norms[i] = math.sqrt(running_suffix_sq)
        running_suffix_sq -= value * value
    
    # ─────────────────────────
    # Candidate Generation Phase
    # ─────────────────────────
    
    for i, (query_feature, query_value) in enumerate(query_features):
        # Remaining suffix norm bound (rs₄)
        rs4 = query_suffix_norms.get(i, 0.0)
        
        # Prune if remaining norm can't reach theta (Cauchy-Schwarz)
        if rs4 < theta:
            break
        
        # Process postings for this feature
        if query_feature not in index.inverted_index:
            continue
        
        for doc_id, doc_value, doc_prefix_norm in index.inverted_index[query_feature]:
            if doc_id in exclude_doc_ids:
                continue
            
            # Check if this is a new candidate
            is_new_candidate = doc_id not in accumulator or accumulator[doc_id] == 0
            
            if is_new_candidate:
                # Check if candidate can reach theta using remaining suffix bound
                # Using Cauchy-Schwarz: remaining similarity ≤ rs4 * ||doc_prefix||₂
                if rs4 * doc_prefix_norm < theta:
                    continue
            
            # Accumulate dot product
            accumulator[doc_id] += query_value * doc_value
            
            # Early pruning: if current score + remaining bound < theta, drop
            # Using Cauchy-Schwarz bound for remaining features
            remaining_bound = rs4 * doc_prefix_norm
            if accumulator[doc_id] + remaining_bound < theta:
                accumulator[doc_id] = 0  # Mark for removal
    
    # ─────────────────────────
    # Verification Phase
    # ─────────────────────────
    
    # The accumulator already contains the full dot product from candidate generation
    # We just need to verify and apply final pruning
    
    for doc_id, dot_product in accumulator.items():
        if doc_id in exclude_doc_ids:
            continue
        
        if dot_product == 0:
            continue
        
        # Get document metadata
        if doc_id not in index.doc_metadata:
            continue
        
        pscore, max_value, doc_norm = index.doc_metadata[doc_id]
        
        # Pscore filtering: if current score + pscore < theta, can't reach threshold
        if dot_product + pscore < theta:
            continue
        
        # For unit-normalized vectors, dot product = cosine similarity
        similarity = dot_product
        
        # Additional pruning: check if we can still improve
        # Using Cauchy-Schwarz: dot(x,y) ≤ ||x||₂ · ||y||₂
        # Since vectors are unit-normalized, this is always ≤ 1
        # But we can use tighter bounds if needed
        
        # Update heap
        if len(heap) < k:
            heapq.heappush(heap, (similarity, doc_id))
            if len(heap) == k:
                theta = max(theta, heap[0][0])  # Update theta to kth best
        elif similarity > heap[0][0]:
            heapq.heapreplace(heap, (similarity, doc_id))
            theta = heap[0][0]  # Update theta to new kth best
    
    # Return results sorted by similarity (descending)
    results = [(doc_id, sim) for sim, doc_id in heap]
    results.sort(key=lambda x: x[1], reverse=True)
    return results


# ─────────────────────────
# 4. Index Management
# ─────────────────────────

class ProfileMatchingService:
    """
    Service for managing profile matching using L2AP.
    Automatically rebuilds index when needed.
    """
    
    def __init__(self):
        self.index = L2APIndex()
        self.index_built = False
        self.index_built_at = None  # Timestamp when index was last built
        self.index_ttl_seconds = 30  # Rebuild index every 30 seconds to catch updates
    
    def invalidate_index(self):
        """
        Mark the index as invalid, forcing a rebuild on next query.
        """
        self.index_built = False
        self.index_built_at = None
        print("Index invalidated - will rebuild on next query")
    
    def update_user_in_index(self, uid: str, profile_data: dict):
        """
        Incrementally update a single user in the index.
        If index is not built, rebuilds it. Otherwise, updates just this user.
        
        Args:
            uid: User UID
            profile_data: User profile dictionary from Firestore
        """
        if not self.index_built:
            # If index not built, rebuild it
            self.rebuild_index()
            return
        
        # Remove old entry if it exists
        if uid in self.index.doc_ids:
            # Remove from inverted index
            for feature in list(self.index.inverted_index.keys()):
                self.index.inverted_index[feature] = [
                    (doc_id, val, pnorm) 
                    for doc_id, val, pnorm in self.index.inverted_index[feature]
                    if doc_id != uid
                ]
                if not self.index.inverted_index[feature]:
                    del self.index.inverted_index[feature]
            
            # Remove from metadata
            if uid in self.index.doc_metadata:
                del self.index.doc_metadata[uid]
            self.index.doc_ids.discard(uid)
        
        # Add new entry
        vector = get_profile_vector(profile_data)
        if vector:
            self.index.add_document(uid, vector)
            # Re-sort affected features in inverted index to maintain order
            for feature in vector.keys():
                if feature in self.index.inverted_index:
                    self.index.inverted_index[feature].sort(key=lambda x: x[1], reverse=True)
            print(f"Updated user {uid} in matching index")
        
        # Invalidate index when interests change to ensure all queries see the latest data
        # This forces a rebuild on the next query, ensuring consistency
        # The TTL is a fallback for catching other types of updates
        self.invalidate_index()
    
    def rebuild_index(self):
        """
        Rebuild the index from all user profiles in Firestore.
        """
        try:
            import time
            print("Building L2AP index from Firestore...")
            users_ref = db.collection("users")
            profiles = {}
            
            for doc in users_ref.stream():
                profile_data = doc.to_dict()
                uid = doc.id
                profiles[uid] = profile_data
            
            self.index.build_index(profiles)
            self.index_built = True
            self.index_built_at = time.time()
            print(f"Index built successfully with {len(self.index.doc_ids)} profiles")
        except Exception as e:
            print(f"Error building index: {e}")
            raise
    
    def _should_rebuild_index(self) -> bool:
        """
        Check if index should be rebuilt based on TTL or if not built.
        """
        if not self.index_built:
            return True
        
        # Rebuild if index is older than TTL
        if self.index_built_at is not None:
            import time
            age_seconds = time.time() - self.index_built_at
            if age_seconds > self.index_ttl_seconds:
                print(f"Index is {age_seconds:.1f}s old (TTL: {self.index_ttl_seconds}s), rebuilding...")
                return True
        
        return False
    
    def find_matches(
        self,
        query_uid: str,
        k: int = 10,
        t_min: float = 0.0,
        exclude_self: bool = True
    ) -> List[Tuple[str, float]]:
        """
        Find k nearest neighbors for a user.
        Automatically rebuilds index if stale (older than TTL).
        
        Args:
            query_uid: User UID to find matches for
            k: Number of matches to return
            t_min: Minimum similarity threshold
            exclude_self: Whether to exclude the query user from results
            
        Returns:
            List of (uid, similarity) tuples
        """
        if self._should_rebuild_index():
            self.rebuild_index()
        
        # Get query user's profile
        try:
            user_ref = db.collection("users").document(query_uid)
            user_doc = user_ref.get()
            
            if not user_doc.exists:
                return []
            
            profile_data = user_doc.to_dict()
            query_vector = get_profile_vector(profile_data)
            
            if not query_vector:
                return []
            
            # Find matches
            exclude_set = {query_uid} if exclude_self else set()
            matches = l2ap_knn(query_vector, self.index, k, t_min, exclude_set)
            
            return matches
            
        except Exception as e:
            print(f"Error finding matches: {e}")
            return []
    
    def find_matches_by_interests(
        self,
        interests: List[str],
        k: int = 10,
        t_min: float = 0.0
    ) -> List[Tuple[str, float]]:
        """
        Find matches based on a list of interests (without a specific user).
        Automatically rebuilds index if stale (older than TTL).
        
        Args:
            interests: List of interest strings
            k: Number of matches to return
            t_min: Minimum similarity threshold
            
        Returns:
            List of (uid, similarity) tuples
        """
        if self._should_rebuild_index():
            self.rebuild_index()
        
        query_vector = normalize_interests(interests)
        if not query_vector:
            return []
        
        matches = l2ap_knn(query_vector, self.index, k, t_min, exclude_doc_ids=set())
        return matches


# Global service instance
_matching_service: Optional[ProfileMatchingService] = None

def get_matching_service() -> ProfileMatchingService:
    """Get or create the global matching service instance."""
    global _matching_service
    if _matching_service is None:
        _matching_service = ProfileMatchingService()
    return _matching_service

