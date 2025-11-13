import { endpoints } from '../constants/api';

export interface MapUrlParams {
  lat: string | number;
  lng: string | number;
  zoom: string | number;
  style: string;
  title: string;
  radius: string | number;
}

/**
 * Builds a map URL from parameters
 * Pure function - no side effects, easily testable
 */
export function buildMapUrl(params: MapUrlParams): string {
  const { lat, lng, zoom, style, title, radius } = params;
  return `${endpoints.maps}?lat=${lat}&lng=${lng}&zoom=${zoom}&style=${encodeURIComponent(style)}&title=${encodeURIComponent(title)}&radius=${radius}`;
}

