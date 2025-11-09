from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

class MatchResult(BaseModel):
    uid: str
    similarity: float
    name: Optional[str] = None
    username: Optional[str] = None

class MatchResponse(BaseModel):
    matches: List[MatchResult]
    query_uid: Optional[str] = None
    k: int
    t_min: float

class FindMatchesRequest(BaseModel):
    uid: str
    k: int = Field(default=10, ge=1, le=100, description="Number of matches to return")
    t_min: float = Field(default=0.0, ge=0.0, le=1.0, description="Minimum similarity threshold")

class FindMatchesByInterestsRequest(BaseModel):
    interests: List[str] = Field(..., min_items=1, description="List of interests to match against")
    k: int = Field(default=10, ge=1, le=100, description="Number of matches to return")
    t_min: float = Field(default=0.0, ge=0.0, le=1.0, description="Minimum similarity threshold")

class SwipeAction(str, Enum):
    LIKE = "like"
    PASS = "pass"

class SwipeRequest(BaseModel):
    target_uid: str = Field(..., alias="targetUid")
    action: SwipeAction

class SwipeResponse(BaseModel):
    success: bool
    is_match: bool = False
    message: str

class PotentialMatch(BaseModel):
    uid: str
    name: Optional[str] = None
    username: Optional[str] = None
    profile_picture: Optional[str] = None
    bio: Optional[str] = None
    profile_description: Optional[str] = None
    interests: Optional[List[str]] = None
    hiking_level: Optional[str] = None
    similarity: float

class GetPotentialMatchesResponse(BaseModel):
    matches: List[PotentialMatch]
    has_more: bool

class MutualMatch(BaseModel):
    uid: str
    name: Optional[str] = None
    username: Optional[str] = None
    profile_picture: Optional[str] = None
    matched_at: str

class GetMatchesResponse(BaseModel):
    matches: List[MutualMatch]

