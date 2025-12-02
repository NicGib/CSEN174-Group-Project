import logging
from fastapi import APIRouter, HTTPException, Query
from typing import List
from ...schemas.events import EventCreate, EventOut, EventDetails, AttendeeAdd, EventDeleteResponse
from ...utils.error_handlers import handle_exceptions
from ...utils.logging_utils import get_logger
from ...events.schedule import (
    create_hiking_event,
    add_attendee_to_event,
    remove_attendee_from_event,
    delete_hiking_event,
    get_event_details,
    list_all_events,
    get_events_by_location,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/events", tags=["events"])

# Log router initialization
logger.info("Initializing events router with prefix: /events")

@router.post("/", response_model=EventOut, status_code=201)
@handle_exceptions
def create_event(payload: EventCreate):
    return create_hiking_event(**payload.model_dump())

@router.get("/", response_model=List[EventDetails])
def list_events(limit: int = Query(50, gt=0, le=200)):
    return list_all_events(limit=limit)

@router.get("/by-location", response_model=List[EventDetails])
def events_by_location(location: str = Query(..., min_length=1)):
    return get_events_by_location(location)

@router.post("/{event_id}/attendees")
@handle_exceptions
def add_attendee(event_id: str, body: AttendeeAdd):
    return add_attendee_to_event(event_id, body.user_uid, body.user_name or "")

@router.delete("/{event_id}/attendees/{user_uid}")
@handle_exceptions
def remove_attendee(event_id: str, user_uid: str):
    return remove_attendee_from_event(event_id, user_uid)

logger.info("Registering DELETE /{event_id} route")
@router.delete("/{event_id}", response_model=EventDeleteResponse, status_code=200)
@handle_exceptions
def delete_event(event_id: str, organizer_uid: str = Query(..., description="UID of the event organizer")):
    """
    Delete an event. Only the organizer can delete their event.
    """
    logger.info(f"DELETE EVENT ENDPOINT CALLED: event_id={event_id}, organizer_uid={organizer_uid}")
    result = delete_hiking_event(event_id, organizer_uid)
    logger.info(f"DELETE EVENT SUCCESS: event_id={event_id}")
    return result

# Verify DELETE route was registered
delete_route_registered = any(
    hasattr(r, 'path') and r.path == "/{event_id}" and hasattr(r, 'methods') and 'DELETE' in r.methods
    for r in router.routes
)
status_msg = f"DELETE /{{event_id}} route registered: {delete_route_registered}"
logger.info(status_msg)
if not delete_route_registered:
    logger.error("ERROR: DELETE route was NOT registered!")

logger.info("Registering GET /{event_id} route")
@router.get("/{event_id}", response_model=EventDetails)
@handle_exceptions
def get_event(event_id: str):
    from ...exceptions import NotFoundError
    data = get_event_details(event_id)
    if not data:
        raise NotFoundError("Event not found")
    return data
