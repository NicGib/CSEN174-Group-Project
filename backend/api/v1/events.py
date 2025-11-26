import logging
from fastapi import APIRouter, HTTPException, Query
from typing import List
from ...schemas.events import EventCreate, EventOut, EventDetails, AttendeeAdd, EventDeleteResponse
# import your service functions
from ...events.schedule import (
    create_hiking_event,
    add_attendee_to_event,
    remove_attendee_from_event,
    delete_hiking_event,
    get_event_details,
    list_all_events,
    get_events_by_location,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/events", tags=["events"])

# Log router initialization
logger.info("Initializing events router with prefix: /events")

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

# CRITICAL: Register DELETE /{event_id} route BEFORE GET /{event_id} 
# FastAPI matches routes in order, so DELETE must come first
print("🔵 Registering DELETE /{event_id} route")
logger.info("Registering DELETE /{event_id} route")
@router.delete("/{event_id}", response_model=EventDeleteResponse, status_code=200)
def delete_event(event_id: str, organizer_uid: str = Query(..., description="UID of the event organizer")):
    """
    Delete an event. Only the organizer can delete their event.
    """
    logger.info(f"🗑️ DELETE EVENT ENDPOINT CALLED: event_id={event_id}, organizer_uid={organizer_uid}")
    logger.info(f"   Decoded event_id: {event_id}")
    logger.info(f"   Decoded organizer_uid: {organizer_uid}")
    try:
        result = delete_hiking_event(event_id, organizer_uid)
        logger.info(f"✅ DELETE EVENT SUCCESS: event_id={event_id}")
        return result
    except ValueError as e:
        logger.warning(f"❌ DELETE EVENT VALUE ERROR: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error(f"❌ DELETE EVENT RUNTIME ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Verify DELETE route was registered
delete_route_registered = any(
    hasattr(r, 'path') and r.path == "/{event_id}" and hasattr(r, 'methods') and 'DELETE' in r.methods
    for r in router.routes
)
status_msg = f"DELETE /{{event_id}} route registered: {delete_route_registered}"
print(f"🔵 {status_msg}")
logger.info(status_msg)
if not delete_route_registered:
    print("❌ ERROR: DELETE route was NOT registered!")
    logger.error("❌ ERROR: DELETE route was NOT registered!")

logger.info("Registering GET /{event_id} route")
@router.get("/{event_id}", response_model=EventDetails)
def get_event(event_id: str):
    data = get_event_details(event_id)
    if not data:
        raise HTTPException(status_code=404, detail="Event not found")
    return data
