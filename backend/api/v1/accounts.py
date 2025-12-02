from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from ...schemas.accounts import (
    SignupIn, SignupOut, LoginIn, LoginOut, UserProfile,
    ProfileUpdateIn, PromoteToWayfarerIn
)
from ...utils.error_handlers import handle_exceptions
from ...utils.logging_utils import get_logger
from ...exceptions import NotFoundError
from ...accounts.signups import (
    signup_with_email_password,
    login_with_email_password,
    get_user_profile,
    update_user_profile,
    promote_user_to_wayfarer,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=SignupOut, status_code=201)
@handle_exceptions
def signup(payload: SignupIn):
        return signup_with_email_password(**payload.model_dump())

@router.post("/login", response_model=LoginOut)
@handle_exceptions
def login(payload: LoginIn):
        return login_with_email_password(**payload.model_dump())

@router.get("/profile/{uid}", response_model=UserProfile | None)
def profile(uid: str):
    return get_user_profile(uid)

@router.put("/profile/{uid}", response_model=UserProfile)
@handle_exceptions
def update_profile(uid: str, payload: ProfileUpdateIn):
    """
    Update user profile. Users can only update their own profile.
    """
        # Convert Pydantic model to dict, handling aliases
    updates = payload.model_dump(exclude_unset=True, by_alias=False)
        
    # Convert date objects to strings if needed
    if "birthday" in updates and updates["birthday"] is not None:
        if hasattr(updates["birthday"], "isoformat"):
            updates["birthday"] = updates["birthday"].isoformat()
    
    updated_profile = update_user_profile(uid, updates)
    
    if updated_profile is None:
        raise NotFoundError("User profile not found")
    
    return updated_profile

@router.post("/promote-to-wayfarer", response_model=UserProfile)
@handle_exceptions
def promote_to_wayfarer(
    payload: PromoteToWayfarerIn,
    admin_uid: str = Header(..., alias="X-Admin-UID", description="UID of the admin performing the promotion")
):
    """
    Promote a user to wayfarer status. Only admins can perform this action.
    Requires X-Admin-UID header with the admin's UID.
    """
    updated_profile = promote_user_to_wayfarer(admin_uid, payload.target_uid)
    
    if updated_profile is None:
        raise NotFoundError("User profile not found")
    
    return updated_profile
