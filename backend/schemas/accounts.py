from pydantic import BaseModel, EmailStr, constr, Field
from typing import Optional, List
from datetime import date
from enum import Enum

class UserStatus(str, Enum):
    USER = "user"
    WAYFARER = "wayfarer"
    ADMIN = "admin"

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

class HomeAddress(BaseModel):
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = Field(None, alias="zipCode")
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    formatted_address: Optional[str] = Field(None, alias="formattedAddress")
    
    class Config:
        populate_by_name = True

class ProfileUpdateIn(BaseModel):
    interests: Optional[List[str]] = None
    birthday: Optional[date] = None
    profile_description: Optional[str] = Field(None, max_length=1000, alias="profileDescription")
    gender: Optional[str] = None
    preferred_name: Optional[str] = Field(None, alias="preferredName")
    bio: Optional[str] = Field(None, max_length=500)
    profile_picture: Optional[str] = Field(None, alias="profilePicture")
    hiking_level: Optional[str] = Field(None, alias="hikingLevel")
    home_address: Optional[HomeAddress] = Field(None, alias="homeAddress")
    
    class Config:
        populate_by_name = True

class PromoteToWayfarerIn(BaseModel):
    target_uid: str = Field(alias="targetUid")
    
    class Config:
        populate_by_name = True

class UserProfile(BaseModel):
    uid: str
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    preferred_name: Optional[str] = Field(None, alias="preferredName")
    interests: Optional[List[str]] = None
    birthday: Optional[date] = None
    profile_description: Optional[str] = Field(None, alias="profileDescription")
    gender: Optional[str] = None
    status: Optional[UserStatus] = UserStatus.USER
    bio: Optional[str] = None
    profile_picture: Optional[str] = Field(None, alias="profilePicture")
    hiking_level: Optional[str] = Field(None, alias="hikingLevel")
    home_address: Optional[HomeAddress] = Field(None, alias="homeAddress")
    total_hikes: Optional[int] = Field(None, alias="totalHikes")
    total_distance: Optional[float] = Field(None, alias="totalDistance")
    achievements: Optional[List[str]] = None
    favorite_trails: Optional[List[str]] = Field(None, alias="favoriteTrails")
    created_at: Optional[str] = Field(None, alias="createdAt")
    last_login_at: Optional[str] = Field(None, alias="lastLoginAt")
    is_active: Optional[bool] = Field(None, alias="isActive")

    class Config:
        populate_by_name = True
