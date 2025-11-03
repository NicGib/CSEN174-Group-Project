export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000/api/v1";

export const endpoints = {
  events: `${API_BASE_URL}/events`,
  maps: `${API_BASE_URL}/maps`,
};


