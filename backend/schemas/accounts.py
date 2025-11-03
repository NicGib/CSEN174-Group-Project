from pydantic import BaseModel, EmailStr, constr
from typing import Optional

class SignupIn(BaseModel):
    name: constr(strip_whitespace=True, min_length=1)
    username: constr(strip_whitespace=True, min_length=1)
    email: EmailStr
    password: constr(min_length=6)

class SignupOut(BaseModel):
    success: bool
    uid: str
    email: EmailStr
    name: str
    username: str
    message: str
    timestamp: str

class LoginIn(BaseModel):
    email: EmailStr
    password: constr(min_length=1)

class LoginOut(BaseModel):
    success: bool
    uid: str
    email: EmailStr
    idToken: str
    refreshToken: str
    expiresInSeconds: int
    message: str
    timestamp: str

class UserProfile(BaseModel):
    uid: str
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
