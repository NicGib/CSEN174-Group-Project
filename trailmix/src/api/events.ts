import { endpoints } from "../constants/api";
import { apiCall, ApiError, getUserFriendlyErrorMessage } from '@/src/utils/errorHandler';

export type EventDetails = {
  event_id: string;
  title: string;
  location: string;
  event_date: string;
  description: string;
  max_attendees: number;
  difficulty_level: string;
  organizer_uid: string;
  attendees: string[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type EventCreate = {
  title: string;
  location: string;
  event_date: string; // YYYY-MM-DD or ISO
  description?: string;
  max_attendees?: number;
  difficulty_level?: "beginner" | "intermediate" | "advanced";
  organizer_uid?: string;
};

export async function listEvents(limit = 50): Promise<EventDetails[]> {
  try {
    return await apiCall<EventDetails[]>(
      `${endpoints.events}?limit=${encodeURIComponent(String(limit))}`,
      { method: 'GET' },
      'Failed to load events'
    );
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw new Error(getUserFriendlyErrorMessage(error));
    }
    throw error instanceof Error ? error : new Error('Failed to load events: Unknown error');
  }
}

export async function createEvent(payload: EventCreate) {
  try {
    return await apiCall(
      `${endpoints.events}/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      'Failed to create event'
    );
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw new Error(getUserFriendlyErrorMessage(error));
    }
    throw error instanceof Error ? error : new Error('Failed to create event: Unknown error');
  }
}

export async function joinEvent(eventId: string, user_uid: string, user_name?: string) {
  try {
    return await apiCall(
      `${endpoints.events}/${encodeURIComponent(eventId)}/attendees`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_uid, user_name: user_name || "" }),
      },
      'Failed to join event'
    );
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw new Error(getUserFriendlyErrorMessage(error));
    }
    throw error instanceof Error ? error : new Error('Failed to join event: Unknown error');
  }
}

export async function leaveEvent(eventId: string, user_uid: string) {
  try {
    // Try DELETE with user id in path first: /events/{id}/attendees/{user_uid}
    try {
      return await apiCall(
        `${endpoints.events}/${encodeURIComponent(eventId)}/attendees/${encodeURIComponent(user_uid)}`,
        { method: "DELETE" },
        'Failed to leave event'
      );
    } catch (firstError) {
      // Fallback: DELETE to /events/{id}/attendees with JSON body
      return await apiCall(
        `${endpoints.events}/${encodeURIComponent(eventId)}/attendees`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_uid }),
        },
        'Failed to leave event'
      );
    }
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw new Error(getUserFriendlyErrorMessage(error));
    }
    throw error instanceof Error ? error : new Error('Failed to leave event: Unknown error');
  }
}

export async function removeAttendee(eventId: string, user_uid: string) {
  try {
    return await apiCall(
      `${endpoints.events}/${encodeURIComponent(eventId)}/attendees/${encodeURIComponent(user_uid)}`,
      { method: "DELETE" },
      'Failed to remove attendee'
    );
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw new Error(getUserFriendlyErrorMessage(error));
    }
    throw error instanceof Error ? error : new Error('Failed to remove attendee: Unknown error');
  }
}

export async function deleteEvent(eventId: string, organizer_uid: string) {
  const url = `${endpoints.events}/${encodeURIComponent(eventId)}?organizer_uid=${encodeURIComponent(organizer_uid)}`;
  console.log("🗑️ [FRONTEND] deleteEvent called");
  console.log("   eventId:", eventId);
  console.log("   organizer_uid:", organizer_uid);
  console.log("   Full URL:", url);
  
  try {
    console.log("   Making DELETE request...");
    const result = await apiCall(
      url,
      { method: "DELETE" },
      'Failed to delete event'
    );
    console.log("   ✅ DELETE request successful");
    return result;
  } catch (error: any) {
    console.error("   ❌ DELETE request error:", error);
    if (error instanceof ApiError) {
      throw new Error(getUserFriendlyErrorMessage(error));
    }
    throw error instanceof Error ? error : new Error('Failed to delete event: Unknown error');
  }
}


