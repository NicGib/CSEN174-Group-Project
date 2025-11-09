"""
Service for handling user swipes and mutual matches.
"""

import firebase_admin
from firebase_admin import firestore
from datetime import datetime
from typing import List, Dict, Optional, Set
import os

# Initialize Firestore
try:
    from backend.accounts.signups import db
except (ImportError, AttributeError):
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


class SwipeService:
    """Service for managing swipes and matches."""
    
    def record_swipe(self, user_uid: str, target_uid: str, action: str) -> Dict:
        """
        Record a swipe action (like or pass).
        
        Args:
            user_uid: UID of the user performing the swipe
            target_uid: UID of the user being swiped on
            action: "like" or "pass"
            
        Returns:
            Dictionary with success status and match information
        """
        if user_uid == target_uid:
            raise ValueError("Cannot swipe on yourself")
        
        if action not in ["like", "pass"]:
            raise ValueError("Action must be 'like' or 'pass'")
        
        try:
            # Record the swipe
            swipe_ref = db.collection("swipes").document(f"{user_uid}_{target_uid}")
            swipe_ref.set({
                "user_uid": user_uid,
                "target_uid": target_uid,
                "action": action,
                "created_at": firestore.SERVER_TIMESTAMP,
            })
            
            # Check for mutual match
            is_match = False
            if action == "like":
                # Check if target has also liked this user
                reverse_swipe_ref = db.collection("swipes").document(f"{target_uid}_{user_uid}")
                reverse_swipe = reverse_swipe_ref.get()
                
                if reverse_swipe.exists:
                    reverse_data = reverse_swipe.to_dict()
                    if reverse_data.get("action") == "like":
                        is_match = True
                        # Create mutual match record
                        self._create_match(user_uid, target_uid)
            
            return {
                "success": True,
                "is_match": is_match,
                "message": "It's a match!" if is_match else "Swipe recorded"
            }
            
        except Exception as e:
            print(f"Error recording swipe: {e}")
            raise RuntimeError(f"Failed to record swipe: {e}")
    
    def _create_match(self, uid1: str, uid2: str):
        """Create a mutual match record."""
        try:
            # Create match document with sorted UIDs for consistency
            match_id = "_".join(sorted([uid1, uid2]))
            match_ref = db.collection("matches").document(match_id)
            
            match_ref.set({
                "user1_uid": uid1,
                "user2_uid": uid2,
                "matched_at": firestore.SERVER_TIMESTAMP,
                "is_active": True,
            })
            
            print(f"Match created between {uid1} and {uid2}")
        except Exception as e:
            print(f"Error creating match: {e}")
            raise
    
    def get_swiped_users(self, user_uid: str) -> Set[str]:
        """
        Get set of user UIDs that have been swiped on.
        
        Args:
            user_uid: UID of the user
            
        Returns:
            Set of target UIDs that have been swiped on
        """
        try:
            swipes_ref = db.collection("swipes")
            query = swipes_ref.where("user_uid", "==", user_uid).stream()
            
            swiped_uids = set()
            for swipe in query:
                data = swipe.to_dict()
                swiped_uids.add(data.get("target_uid"))
            
            return swiped_uids
        except Exception as e:
            print(f"Error getting swiped users: {e}")
            return set()
    
    def get_matches(self, user_uid: str) -> List[Dict]:
        """
        Get all mutual matches for a user.
        
        Args:
            user_uid: UID of the user
            
        Returns:
            List of match dictionaries with user info
        """
        try:
            matches_ref = db.collection("matches")
            # Query matches where user is either user1 or user2
            query1 = matches_ref.where("user1_uid", "==", user_uid).where("is_active", "==", True).stream()
            query2 = matches_ref.where("user2_uid", "==", user_uid).where("is_active", "==", True).stream()
            
            matches = []
            for match in query1:
                data = match.to_dict()
                other_uid = data.get("user2_uid")
                matches.append({
                    "match_id": match.id,
                    "other_uid": other_uid,
                    "matched_at": data.get("matched_at"),
                })
            
            for match in query2:
                data = match.to_dict()
                other_uid = data.get("user1_uid")
                matches.append({
                    "match_id": match.id,
                    "other_uid": other_uid,
                    "matched_at": data.get("matched_at"),
                })
            
            return matches
        except Exception as e:
            print(f"Error getting matches: {e}")
            return []
    
    def has_swiped(self, user_uid: str, target_uid: str) -> bool:
        """Check if user has already swiped on target."""
        try:
            swipe_ref = db.collection("swipes").document(f"{user_uid}_{target_uid}")
            return swipe_ref.get().exists
        except Exception as e:
            print(f"Error checking swipe: {e}")
            return False


# Global service instance
_swipe_service: Optional[SwipeService] = None

def get_swipe_service() -> SwipeService:
    """Get or create the global swipe service instance."""
    global _swipe_service
    if _swipe_service is None:
        _swipe_service = SwipeService()
    return _swipe_service

