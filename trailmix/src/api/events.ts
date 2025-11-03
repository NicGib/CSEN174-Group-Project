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
  const res = await fetch(`${endpoints.events}?limit=${encodeURIComponent(String(limit))}`);
  if (!res.ok) throw new Error(`Failed to load events (${res.status})`);
  return res.json();
}

export async function createEvent(payload: EventCreate) {
  const res = await fetch(`${endpoints.events}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create event (${res.status})`);
  return res.json();
}

export async function joinEvent(eventId: string, user_uid: string, user_name?: string) {
  const res = await fetch(`${endpoints.events}/${encodeURIComponent(eventId)}/attendees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_uid, user_name: user_name || "" }),
  });
  if (!res.ok) throw new Error(`Failed to join event (${res.status})`);
  return res.json();
}

export async function leaveEvent(eventId: string, user_uid: string) {
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
  if (!res.ok) throw new Error(`Failed to leave event (${res.status})`);
  return res.json?.() ?? {};
}


