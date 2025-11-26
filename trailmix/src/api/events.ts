import { endpoints } from "../constants/api";

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
    const res = await fetch(`${endpoints.events}?limit=${encodeURIComponent(String(limit))}`);
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(`Failed to load events (${res.status}): ${errorText || res.statusText}`);
    }
    return res.json();
  } catch (error: any) {
    if (error.message?.includes("Failed to load")) throw error;
    throw new Error(`Network error: ${error.message || "Could not connect to server"}`);
  }
}

export async function createEvent(payload: EventCreate) {
  try {
    const res = await fetch(`${endpoints.events}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(`Failed to create event (${res.status}): ${errorText || res.statusText}`);
    }
    return res.json();
  } catch (error: any) {
    if (error.message?.includes("Failed to create")) throw error;
    throw new Error(`Network error: ${error.message || "Could not connect to server"}`);
  }
}

export async function joinEvent(eventId: string, user_uid: string, user_name?: string) {
  try {
    const res = await fetch(`${endpoints.events}/${encodeURIComponent(eventId)}/attendees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_uid, user_name: user_name || "" }),
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(`Failed to join event (${res.status}): ${errorText || res.statusText}`);
    }
    return res.json();
  } catch (error: any) {
    if (error.message?.includes("Failed to join")) throw error;
    throw new Error(`Network error: ${error.message || "Could not connect to server"}`);
  }
}

export async function leaveEvent(eventId: string, user_uid: string) {
  try {
    // Try DELETE with user id in path first: /events/{id}/attendees/{user_uid}
    let res = await fetch(
      `${endpoints.events}/${encodeURIComponent(eventId)}/attendees/${encodeURIComponent(user_uid)}`,
      { method: "DELETE" }
    );
    if (res.ok) return res.json?.() ?? {};

    // Fallback: DELETE to /events/{id}/attendees with JSON body
    res = await fetch(`${endpoints.events}/${encodeURIComponent(eventId)}/attendees`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_uid }),
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(`Failed to leave event (${res.status}): ${errorText || res.statusText}`);
    }
    return res.json?.() ?? {};
  } catch (error: any) {
    if (error.message?.includes("Failed to leave")) throw error;
    throw new Error(`Network error: ${error.message || "Could not connect to server"}`);
  }
}

export async function removeAttendee(eventId: string, user_uid: string) {
  try {
    const res = await fetch(
      `${endpoints.events}/${encodeURIComponent(eventId)}/attendees/${encodeURIComponent(user_uid)}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(`Failed to remove attendee (${res.status}): ${errorText || res.statusText}`);
    }
    return res.json?.() ?? {};
  } catch (error: any) {
    if (error.message?.includes("Failed to remove")) throw error;
    throw new Error(`Network error: ${error.message || "Could not connect to server"}`);
  }
}

export async function deleteEvent(eventId: string, organizer_uid: string) {
  const url = `${endpoints.events}/${encodeURIComponent(eventId)}?organizer_uid=${encodeURIComponent(organizer_uid)}`;
  console.log("🗑️ [FRONTEND] deleteEvent called");
  console.log("   eventId:", eventId);
  console.log("   organizer_uid:", organizer_uid);
  console.log("   Full URL:", url);
  console.log("   Encoded eventId:", encodeURIComponent(eventId));
  console.log("   Encoded organizer_uid:", encodeURIComponent(organizer_uid));
  
  try {
    console.log("   Making DELETE request...");
    const res = await fetch(url, { method: "DELETE" });
    
    console.log("   Response status:", res.status);
    console.log("   Response statusText:", res.statusText);
    console.log("   Response headers:", Object.fromEntries(res.headers.entries()));
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      console.error("   ❌ DELETE request failed:", res.status, errorText);
      throw new Error(`Failed to delete event (${res.status}): ${errorText || res.statusText}`);
    }
    
    const result = res.json?.() ?? {};
    console.log("   ✅ DELETE request successful");
    return result;
  } catch (error: any) {
    console.error("   ❌ DELETE request error:", error);
    if (error.message?.includes("Failed to delete")) throw error;
    throw new Error(`Network error: ${error.message || "Could not connect to server"}`);
  }
}


