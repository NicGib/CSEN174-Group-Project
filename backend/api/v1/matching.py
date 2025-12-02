from fastapi import APIRouter, HTTPException, Query
from typing import List
from ...schemas.matching import (
    MatchResult, MatchResponse, FindMatchesRequest, FindMatchesByInterestsRequest,
    SwipeRequest, SwipeResponse, PotentialMatch, GetPotentialMatchesResponse,
    MutualMatch, GetMatchesResponse
)
from ...utils.error_handlers import handle_exceptions
from ...utils.logging_utils import get_logger
from ...matching.profile_matching import get_matching_service
from ...matching.swipe_service import get_swipe_service
from ...accounts.signups import get_user_profile, db

logger = get_logger(__name__)
router = APIRouter(prefix="/matching", tags=["matching"])

@router.post("/find-matches", response_model=MatchResponse)
@handle_exceptions
def find_matches(payload: FindMatchesRequest):
    """
    Find k nearest neighbors for a user based on their interests.
    Uses L2AP algorithm for fast cosine similarity search.
    """
    service = get_matching_service()
    matches = service.find_matches(
        query_uid=payload.uid,
        k=payload.k,
        t_min=payload.t_min,
        exclude_self=True
    )
    
    # Enrich matches with user profile data
    match_results = []
    for uid, similarity in matches:
        profile = get_user_profile(uid)
        if profile:
            match_results.append(MatchResult(
                uid=uid,
                similarity=similarity,
                name=profile.get("name"),
                username=profile.get("username")
            ))
    
    return MatchResponse(
        matches=match_results,
        query_uid=payload.uid,
        k=payload.k,
        t_min=payload.t_min
    )

@router.post("/find-by-interests", response_model=MatchResponse)
@handle_exceptions
def find_matches_by_interests(payload: FindMatchesByInterestsRequest):
    """
    Find matches based on a list of interests (without requiring a user profile).
    Uses L2AP algorithm for fast cosine similarity search.
    """
    service = get_matching_service()
    matches = service.find_matches_by_interests(
        interests=payload.interests,
        k=payload.k,
        t_min=payload.t_min
    )
    
    # Enrich matches with user profile data
    match_results = []
    for uid, similarity in matches:
        profile = get_user_profile(uid)
        if profile:
            match_results.append(MatchResult(
                uid=uid,
                similarity=similarity,
                name=profile.get("name"),
                username=profile.get("username")
            ))
    
    return MatchResponse(
        matches=match_results,
        query_uid=None,
        k=payload.k,
        t_min=payload.t_min
    )

@router.post("/rebuild-index")
@handle_exceptions
def rebuild_index():
    """
    Manually rebuild the L2AP index from all user profiles.
    
    Note: The index now automatically updates when profiles change,
    so manual rebuilds are typically not needed. This endpoint is
    useful for:
    - Initial setup
    - Recovering from errors
    - Bulk profile imports
    """
    service = get_matching_service()
    service.rebuild_index()
    return {"success": True, "message": "Index rebuilt successfully"}

@router.get("/matches/{uid}", response_model=MatchResponse)
@handle_exceptions
def get_matches(
    uid: str,
    k: int = Query(10, ge=1, le=100, description="Number of matches to return"),
    t_min: float = Query(0.0, ge=0.0, le=1.0, description="Minimum similarity threshold")
):
    """
    Find k nearest neighbors for a user (GET endpoint).
    """
    service = get_matching_service()
    matches = service.find_matches(
        query_uid=uid,
        k=k,
        t_min=t_min,
        exclude_self=True
    )
    
    # Enrich matches with user profile data
    match_results = []
    for match_uid, similarity in matches:
        profile = get_user_profile(match_uid)
        if profile:
            match_results.append(MatchResult(
                uid=match_uid,
                similarity=similarity,
                name=profile.get("name"),
                username=profile.get("username")
            ))
    
    return MatchResponse(
        matches=match_results,
        query_uid=uid,
        k=k,
        t_min=t_min
    )

@router.get("/potential-matches/{uid}", response_model=GetPotentialMatchesResponse)
@handle_exceptions
def get_potential_matches(
    uid: str,
    limit: int = Query(50, ge=1, le=100, description="Number of potential matches to return"),
    exclude_swiped: bool = Query(True, description="Exclude already swiped users")
):
    """
    Get potential matches for swiping interface.
    Returns users sorted by similarity, excluding already swiped users.
    """
    service = get_matching_service()
    swipe_service = get_swipe_service()
    
    # Get swiped users to exclude
    exclude_set = set()
    if exclude_swiped:
        exclude_set = swipe_service.get_swiped_users(uid)
        logger.debug(f"User {uid} has swiped on {len(exclude_set)} users")
    
    # Find matches using L2AP
    matches = service.find_matches(
        query_uid=uid,
        k=limit * 2,  # Get more to account for exclusions
        t_min=0.0,
        exclude_self=True
    )
    
    logger.debug(f"Found {len(matches)} matches for user {uid} (before filtering)")
    
    # Filter out swiped users and enrich with profile data
    potential_matches = []
    for match_uid, similarity in matches:
        if match_uid in exclude_set:
            logger.debug(f"Excluding {match_uid} (already swiped)")
            continue
        
        if len(potential_matches) >= limit:
            break
        
        profile = get_user_profile(match_uid)
        if profile:
            potential_matches.append(PotentialMatch(
                uid=match_uid,
                name=profile.get("name"),
                username=profile.get("username"),
                profile_picture=profile.get("profilePicture"),
                bio=profile.get("bio"),
                profile_description=profile.get("profileDescription"),
                interests=profile.get("interests", []),
                hiking_level=profile.get("hikingLevel"),
                similarity=similarity
            ))
        else:
            logger.debug(f"Skipping {match_uid} (no profile found)")
    
    logger.debug(f"Returning {len(potential_matches)} potential matches")
    return GetPotentialMatchesResponse(
        matches=potential_matches,
        has_more=len(matches) > len(potential_matches)
    )

@router.post("/swipe/{uid}", response_model=SwipeResponse)
@handle_exceptions
def swipe(payload: SwipeRequest, uid: str):
    """
    Record a swipe action (like or pass) on a user.
    Returns whether it's a mutual match.
    """
    swipe_service = get_swipe_service()
    result = swipe_service.record_swipe(
        user_uid=uid,
        target_uid=payload.target_uid,
        action=payload.action.value
    )
    
    return SwipeResponse(
        success=result["success"],
        is_match=result["is_match"],
        message=result["message"]
    )

@router.get("/mutual-matches/{uid}", response_model=GetMatchesResponse)
@handle_exceptions
def get_mutual_matches(uid: str):
    """
    Get all mutual matches for a user.
    """
    swipe_service = get_swipe_service()
    matches = swipe_service.get_matches(uid)
    
    # Enrich with user profile data
    match_results = []
    for match in matches:
        other_uid = match["other_uid"]
        profile = get_user_profile(other_uid)
        if profile:
            matched_at = match.get("matched_at")
            if matched_at:
                if hasattr(matched_at, 'isoformat'):
                    matched_at_str = matched_at.isoformat()
                else:
                    matched_at_str = str(matched_at)
            else:
                matched_at_str = ""
            
            match_results.append(MutualMatch(
                uid=other_uid,
                name=profile.get("name"),
                username=profile.get("username"),
                profile_picture=profile.get("profilePicture"),
                matched_at=matched_at_str
            ))
    
    return GetMatchesResponse(matches=match_results)

@router.get("/debug/user/{uid}")
def debug_user_matching(uid: str):
    """
    Debug endpoint to check user's matching status.
    Shows interests, vector, index status, and potential matches.
    """
    try:
        from ...matching.profile_matching import get_profile_vector, normalize_interests
        from firebase_admin import firestore
        
        # Get user profile
        user_ref = db.collection("users").document(uid)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return {"error": f"User {uid} not found"}
        
        profile_data = user_doc.to_dict()
        interests = profile_data.get("interests", [])
        query_vector = get_profile_vector(profile_data)
        
        # Get matching service
        service = get_matching_service()
        swipe_service = get_swipe_service()
        
        # Get swiped users
        swiped_users = swipe_service.get_swiped_users(uid)
        
        # Get matches
        matches = service.find_matches(
            query_uid=uid,
            k=50,
            t_min=0.0,
            exclude_self=True
        )
        
        # Check if user is in index
        in_index = uid in service.index.doc_ids
        
        return {
            "uid": uid,
            "name": profile_data.get("name"),
            "username": profile_data.get("username"),
            "interests": interests,
            "interests_count": len(interests),
            "query_vector": query_vector,
            "query_vector_size": len(query_vector),
            "in_index": in_index,
            "index_total_users": len(service.index.doc_ids),
            "swiped_users": list(swiped_users),
            "swiped_count": len(swiped_users),
            "matches_found": len(matches),
            "matches": [
                {
                    "uid": match_uid,
                    "similarity": float(similarity),
                    "swiped": match_uid in swiped_users
                }
                for match_uid, similarity in matches[:10]  # First 10
            ]
        }
    except Exception as e:
        logger.error(f"Error in debug endpoint: {e}", exc_info=True)
        return {
            "error": str(e),
            "traceback": None  # Don't expose traceback in production
        }

