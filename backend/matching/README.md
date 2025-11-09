# Profile Matching with L2AP

This module implements a k-NN (k-nearest neighbors) profile matching system using the L2AP (L2 All-Pairs Similarity Search) algorithm.

## Overview

The L2AP algorithm provides fast exact cosine similarity search for sparse vectors. It's based on the paper:
- **"L2AP: Fast Cosine Similarity Search With Prefix L2-Norm Bounds"** (Anastasiu & Karypis, ICDE 2014)

## How It Works

### 1. Vector Representation

User interests are converted into sparse, unit-normalized vectors:
- Each interest is a feature in the vector
- Binary weighting: 1 if interest present, 0 otherwise
- Vectors are L2-normalized (unit length) for cosine similarity

### 2. Index Structure

The L2AP index maintains:
- **Inverted Index**: Maps each interest (feature) → list of (user_id, value, prefix_norm)
- **Document Metadata**: Stores per-user pscore, max feature value, and vector norm
- **Feature Ordering**: Features ordered by decreasing value for efficient prefix processing

### 3. k-NN Query with Dynamic Threshold

The algorithm uses a dynamic threshold θ that adapts during search:
- Starts at `t_min` (minimum similarity threshold)
- Updates to the kth best similarity as candidates are found
- Uses Cauchy-Schwarz bounds for aggressive pruning

### 4. Pruning Techniques

The implementation uses multiple pruning strategies:

1. **Remaining Suffix Bound (rs₄)**: Prunes candidates that can't reach θ using remaining query features
2. **Pscore Filtering**: Uses prefix upper bounds to filter candidates early
3. **Cauchy-Schwarz Bounds**: Leverages L2-norm bounds for tight pruning
4. **Early Termination**: Stops processing when remaining features can't improve results

## API Usage

### Find Matches for a User

```python
POST /api/v1/matching/find-matches
{
  "uid": "user123",
  "k": 10,
  "t_min": 0.0
}
```

### Find Matches by Interests

```python
POST /api/v1/matching/find-by-interests
{
  "interests": ["hiking", "camping", "photography"],
  "k": 10,
  "t_min": 0.0
}
```

### Rebuild Index

```python
POST /api/v1/matching/rebuild-index
```

## Performance Characteristics

- **Exact Results**: Returns exact k-NN (not approximate)
- **Fast Pruning**: L2-norm bounds enable early termination
- **Sparse Vector Optimized**: Designed for sparse feature vectors (interests)
- **Scalable**: Efficient for large user bases with many interests

## Implementation Details

### Vector Normalization

```python
# Binary weighting
vector = {interest: 1.0 for interest in interests}

# Unit normalization
norm = sqrt(sum(v² for v in vector.values()))
vector = {k: v/norm for k, v in vector.items()}
```

### Dynamic Threshold

The threshold θ is updated during search:
- Initially: `θ = t_min`
- After k candidates found: `θ = kth_best_similarity`
- This tightens pruning as better candidates are discovered

### Index Building

The index is built offline:
1. Load all user profiles from Firestore
2. Convert interests to normalized vectors
3. Build inverted index with prefix norms
4. Calculate pscore for each document

## Example

```python
from backend.matching.profile_matching import get_matching_service

service = get_matching_service()
service.rebuild_index()

# Find 10 matches for user
matches = service.find_matches("user123", k=10, t_min=0.0)

for uid, similarity in matches:
    print(f"User {uid}: similarity = {similarity:.3f}")
```

## References

- Anastasiu, D. C., & Karypis, G. (2014). L2AP: Fast cosine similarity search with prefix L2-norm bounds. In *2014 IEEE 30th International Conference on Data Engineering* (pp. 784-795). IEEE.

