from fastapi import APIRouter, HTTPException, Query
from typing import List
from schemas.events import EventCreate, EventOut, EventDetails, AttendeeAdd
# import your service functions
from events.schedule import (
    create_hiking_event,
    add_attendee_to_event,
    remove_attendee_from_event,
    get_event_details,
    list_all_events,
    get_events_by_location,
)

router = APIRouter(prefix="/events", tags=["events"])

@router.post("/", response_model=EventOut, status_code=201)
def create_event(payload: EventCreate):
    try:
        return create_hiking_event(**payload.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[EventDetails])
def list_events(limit: int = Query(50, gt=0, le=200)):
    return list_all_events(limit=limit)

@router.get("/{event_id}", response_model=EventDetails)
def get_event(event_id: str):
    data = get_event_details(event_id)
    if not data:
        raise HTTPException(status_code=404, detail="Event not found")
    return data

@router.get("/by-location", response_model=List[EventDetails])
def events_by_location(location: str = Query(..., min_length=1)):
    return get_events_by_location(location)

@router.post("/{event_id}/attendees")
def add_attendee(event_id: str, body: AttendeeAdd):
    try:
        return add_attendee_to_event(event_id, body.user_uid, body.user_name or "")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{event_id}/attendees/{user_uid}")
def remove_attendee(event_id: str, user_uid: str):
    try:
        return remove_attendee_from_event(event_id, user_uid)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
