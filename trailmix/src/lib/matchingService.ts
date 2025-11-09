import { endpoints } from '../constants/api';
import { auth } from './firebase';

export interface PotentialMatch {
  uid: string;
  name?: string;
  username?: string;
  profilePicture?: string;
  bio?: string;
  profileDescription?: string;
  interests?: string[];
  hikingLevel?: string;
  similarity: number;
}

export interface SwipeResponse {
  success: boolean;
  isMatch: boolean;
  message: string;
}

export interface MutualMatch {
  uid: string;
  name?: string;
  username?: string;
  profilePicture?: string;
  matchedAt: string;
}

/**
 * Get potential matches for swiping
 */
export const getPotentialMatches = async (
  limit: number = 50,
  excludeSwiped: boolean = true
): Promise<{ matches: PotentialMatch[]; hasMore: boolean }> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    const response = await fetch(
      `${endpoints.matching}/potential-matches/${user.uid}?limit=${limit}&exclude_swiped=${excludeSwiped}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get potential matches: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting potential matches:', error);
    throw error;
  }
};

/**
 * Record a swipe action
 */
export const swipe = async (
  targetUid: string,
  action: 'like' | 'pass'
): Promise<SwipeResponse> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    const response = await fetch(`${endpoints.matching}/swipe/${user.uid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetUid,
        action,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to record swipe: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: data.success,
      isMatch: data.is_match,
      message: data.message,
    };
  } catch (error) {
    console.error('Error recording swipe:', error);
    throw error;
  }
};

/**
 * Get mutual matches
 */
export const getMutualMatches = async (): Promise<MutualMatch[]> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    const response = await fetch(`${endpoints.matching}/mutual-matches/${user.uid}`);

    if (!response.ok) {
      throw new Error(`Failed to get matches: ${response.statusText}`);
    }

    const data = await response.json();
    return data.matches.map((match: any) => ({
      uid: match.uid,
      name: match.name,
      username: match.username,
      profilePicture: match.profile_picture,
      matchedAt: match.matched_at,
    }));
  } catch (error) {
    console.error('Error getting mutual matches:', error);
    throw error;
  }
};

