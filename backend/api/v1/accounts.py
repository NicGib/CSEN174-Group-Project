from fastapi import APIRouter, HTTPException
from ...schemas.accounts import SignupIn, SignupOut, LoginIn, LoginOut, UserProfile
from ...accounts.signups import (
    signup_with_email_password,
    login_with_email_password,
    get_user_profile,
)

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=SignupOut, status_code=201)
def signup(payload: SignupIn):
    try:
        return signup_with_email_password(**payload.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login", response_model=LoginOut)
def login(payload: LoginIn):
    try:
        return login_with_email_password(**payload.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.get("/profile/{uid}", response_model=UserProfile | None)
def profile(uid: str):
    return get_user_profile(uid)
